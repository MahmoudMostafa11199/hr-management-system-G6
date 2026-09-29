import { GetAttendanceReportQueryDto } from './dtos/attendance-report-query.dto';
import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';
import { buildPaginationMeta, getPaginationParams, PaginationMeta } from 'src/common/pagination-helper';
import { Attendance, AttendanceStatus, Prisma } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { GetAttendancesQueryDto } from './dtos/attendance-query.dto';
import { CreateAttendanceDto } from './dtos/create-attendance.dto';
import { UpdateAttendanceDto } from './dtos/update-attendance.dto';
import { GetAttendanceDepartmentLevelQueryDto } from './dtos/attendance-department-level-query.dto';
import { Response } from 'express';
import ExcelJS from 'exceljs/dist/es5';
import { Cron } from '@nestjs/schedule';

dayjs.extend(utc);

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  //
  async createAttendance(dto: CreateAttendanceDto, markedById: string): Promise<Attendance> {
    const employee = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
    if (!employee) throw new NotFoundException('Employee not found');

    const shift = await this.prisma.shiftConfig.findUnique({ where: { id: dto.shiftId } });
    if (!shift) throw new BadRequestException('Shift not found');

    const existing = await this.prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: dto.employeeId,
          date: new Date(dto.date),
        },
      },
    });
    if (existing) throw new ConflictException('Attendance record already exists for this employee on this date');

    const shiftStart = dayjs.utc(`${dto.date} ${shift.startTime}`);
    const graceEnd = shiftStart.add(shift.lateToleranceMinutes, 'minute');

    let status: AttendanceStatus;
    if (dto.checkIn) {
      const checkInTime = dayjs.utc(dto.checkIn);
      status = checkInTime.isAfter(graceEnd) ? 'LATE' : 'PRESENT';
    } else {
      if (!dto.status) throw new BadRequestException('Status is required when no check-in time is provided');
      status = dto.status;
    }

    return this.prisma.attendance.create({
      data: {
        ...dto,
        date: new Date(dto.date),
        checkIn: dto.checkIn ? new Date(dto.checkIn) : undefined,
        checkOut: dto.checkOut ? new Date(dto.checkOut) : undefined,
        status,
        employeeId: dto.employeeId,
        markedById: markedById,
        shiftId: dto.shiftId,
      },
    });
  }

  //
  async updateAttendance(id: string, dto: UpdateAttendanceDto): Promise<Attendance> {
    const attendance = await this.getAttendance(id);

    const isSameDay = dayjs().isSame(attendance.date, 'day');
    if (!isSameDay && attendance.status !== 'ABSENT')
      throw new BadRequestException('Attendance can only edited on the same day');

    let status: AttendanceStatus = dto.status ?? attendance.status;

    if (!dto.status && dto.checkIn && !dayjs(attendance.checkIn).isSame(dto.checkIn)) {
      const shiftId = dto.shiftId || attendance.shiftId;
      if (!shiftId) throw new BadRequestException('Shift is required to set check-in');

      const shift = await this.prisma.shiftConfig.findUnique({ where: { id: shiftId } });
      if (!shift) throw new BadRequestException('Shift not found');

      const shiftStart = dayjs.utc(`${dto.date || dayjs(attendance.date).format('YYYY-MM-DD')} ${shift.startTime}`);
      const graceEnd = shiftStart.add(+shift.lateToleranceMinutes, 'minute');
      const checkInTime = dayjs.utc(dto.checkIn);

      status = checkInTime.isAfter(graceEnd) ? 'LATE' : 'PRESENT';
    }

    return this.prisma.attendance.update({
      where: { id },
      data: {
        ...dto,
        status,
      },
    });
  }

  //
  async getAttendances(query: GetAttendancesQueryDto): Promise<{ data: Attendance[]; meta: PaginationMeta }> {
    const { page = 1, limit = 20, employeeId, departmentId, startDate, endDate, status } = query;

    const where: Prisma.AttendanceWhereInput = {
      ...(status && { status }),
      ...(employeeId && { employeeId }),
      ...(departmentId && { employee: { departmentId } }),
      ...(startDate &&
        endDate && {
          date: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        }),
    };

    const { skip, take } = getPaginationParams(page, limit);

    const [data, count] = await this.prisma.$transaction([
      this.prisma.attendance.findMany({
        where,
        skip,
        take,

        include: {
          employee: {
            select: {
              firstName: true,
              lastName: true,
              jobTitle: true,
            },
          },
          markedBy: {
            select: {
              email: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.attendance.count({ where }),
    ]);
    const meta = buildPaginationMeta(count, page, limit);

    return { data, meta };
  }

  //
  async getAttendance(id: string): Promise<Attendance> {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id },
      include: {
        employee: true,
        markedBy: true,
      },
    });
    if (!attendance) throw new NotFoundException('Attendance not found');

    return attendance;
  }

  //
  async getMyAttendance(
    userId: string,
    query: PaginationQueryDto,
  ): Promise<{ data: Attendance[]; meta: PaginationMeta }> {
    const { page = 1, limit = 20 } = query;

    const employee = await this.prisma.employee.findUnique({ where: { userId } });
    if (!employee) throw new NotFoundException('Employee profile not found');

    const where: Prisma.AttendanceWhereInput = { employeeId: employee.id };

    const { skip, take } = getPaginationParams(page, limit);

    const [data, count] = await this.prisma.$transaction([
      this.prisma.attendance.findMany({
        where,
        skip,
        take,
        orderBy: { date: 'desc' },
        include: {
          employee: true,
          markedBy: true,
        },
      }),
      this.prisma.attendance.count({ where }),
    ]);

    return { data, meta: buildPaginationMeta(count, page, limit) };
  }

  //
  async getMonthlyReport(query: GetAttendanceReportQueryDto) {
    const { employeeId, month, year } = query;

    const targetDate = month && year ? dayjs(`${year}-${month}-01`) : dayjs();
    const startOfMonth = targetDate.startOf('month').toDate();
    const endOfMonth = targetDate.endOf('month').toDate();

    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException('Employee not found');

    const counts = await this.prisma.attendance.groupBy({
      by: ['status'],
      where: { employeeId: employeeId, date: { gte: startOfMonth, lte: endOfMonth } },
      _count: true,
    });

    const summary = {
      presentDays: counts.find((c) => c.status === 'PRESENT')?._count ?? 0,
      lateDays: counts.find((c) => c.status === 'LATE')?._count ?? 0,
      absentDays: counts.find((c) => c.status === 'ABSENT')?._count ?? 0,
      onLeaveDays: counts.find((c) => c.status === 'ON_LEAVE')?._count ?? 0,
    };

    const totalRecorded = summary.presentDays + summary.absentDays + summary.lateDays + summary.onLeaveDays;

    return {
      employeeId,
      month,
      year,
      ...summary,
      totalRecorded,
    };
  }

  //
  async getDepartmentLevel(query: GetAttendanceDepartmentLevelQueryDto) {
    const { departmentId, month, year } = query;

    const startOfMonth = dayjs(`${year}-${month}-01`).startOf('month').toDate();
    const endOfMonth = dayjs(`${year}-${month}-01`).endOf('month').toDate();

    const department = await this.prisma.department.findUnique({ where: { id: departmentId } });
    if (!department) throw new NotFoundException('Department not found');

    const employees = await this.prisma.employee.findMany({ where: { departmentId } });
    if (!employees.length)
      return {
        departmentId,
        departmentName: department.name,
        month,
        year,
        totalEmployees: 0,
        presentDays: 0,
        lateDays: 0,
        absentDays: 0,
        onLeaveDays: 0,
        attendanceRate: 0,
      };

    const employeeIds = employees.map((em) => em.id);

    const counts = await this.prisma.attendance.groupBy({
      by: ['status'],
      where: {
        employeeId: {
          in: employeeIds,
        },
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      _count: true,
    });

    const summary = {
      presentDays: counts.find((c) => c.status === 'PRESENT')?._count ?? 0,
      lateDays: counts.find((c) => c.status === 'LATE')?._count ?? 0,
      absentDays: counts.find((c) => c.status === 'ABSENT')?._count ?? 0,
      onLeaveDays: counts.find((c) => c.status === 'ON_LEAVE')?._count ?? 0,
    };

    const daysInMonth = dayjs(endOfMonth).date();
    const expectedAttendanceDays = daysInMonth * employees.length;
    const actualAttendedDays = +summary.presentDays + +summary.lateDays;

    const attendanceRate =
      expectedAttendanceDays > 0 ? Math.round((actualAttendedDays / expectedAttendanceDays) * 100) : 0;

    return {
      departmentId,
      departmentName: department.name,
      month,
      year,
      totalEmployees: employees.length,
      ...summary,
      attendanceRate,
    };
  }

  //
  async getExportMonthlyReportExcel(query: GetAttendanceReportQueryDto, res: Response) {
    const report = await this.getMonthlyReport(query);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Attendance Report');

    sheet.columns = [
      { header: 'Metric', key: 'metric' },
      { header: 'Value', key: 'value' },
    ];

    sheet.addRows([
      { metric: 'Present Days', value: report.presentDays },
      { metric: 'Late Days', value: report.lateDays },
      { metric: 'Absent Days', value: report.absentDays },
      { metric: 'On Leave Days', value: report.onLeaveDays },
    ]);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=attendance-report.xlsx');

    await workbook.xlsx.write(res);

    res.end();
  }

  //
  @Cron('55 23 * * 0-4', { timeZone: 'Africa/Cairo' })
  async handleDailyAbsent() {
    try {
      const { markedAbsent } = await this.markAbsentForDate(new Date());
      this.logger.log(`Marked ${markedAbsent} employees absent`);
    } catch (err) {
      this.logger.error('Failed to mark absent employees', err instanceof Error ? err.stack : err);
    }
  }

  async markAbsentForDate(date: Date) {
    const day = dayjs.utc(date).startOf('day');
    const currentDate = day.toDate();
    const currentDay = day.day();

    if (currentDay === 5 || currentDay === 6) return { markedAbsent: 0 };

    const employeesWithoutAttendance = await this.prisma.employee.findMany({
      where: {
        status: 'ACTIVE',
        hireDate: { lte: currentDate },
        attendance: { none: { date: currentDate } },
      },
      select: { id: true },
    });

    const attendances = await this.prisma.attendance.createMany({
      data: employeesWithoutAttendance.map((emp) => ({
        date: currentDate,
        employeeId: emp.id,
        status: 'ABSENT',
        markedById: null,
        shiftId: null,
      })),
      skipDuplicates: true,
    });

    return { markedAbsent: attendances.count };
  }
}

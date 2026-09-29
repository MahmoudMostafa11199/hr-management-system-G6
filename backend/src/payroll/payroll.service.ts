import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { AttendanceService } from 'src/attendance/attendance.service';
import { Employee, PayrollConfig } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { TasksService } from 'src/tasks/tasks.service';
import { CalculatePayrollQueryDto } from './dtos/calculate-payroll-query.dto';
import { CreatePayrollConfigDto } from './dtos/create.payroll.config.dto';
import { PayslipQueryDto } from './dtos/payslip-query.dto';
import { buildPaginationMeta, getPaginationParams } from 'src/common/pagination-helper';
import { PayslipWhereInput } from 'src/generated/prisma/models';
import { JwtPayloadType } from 'src/utils/types';
import { MyPayslipQueryDto } from './dtos/my-payslip-query.dto';
import { EmployeeService } from 'src/employee/employee.service';
dayjs.extend(utc);
import pdfmake from 'pdfmake';
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { NotificationsService } from 'src/notifications/notifications.service';

const fonts = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
};

@Injectable()
export class PayrollService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attendanceService: AttendanceService,
    private readonly tasksService: TasksService,
    private readonly employeeService: EmployeeService,
    private readonly notificationsService: NotificationsService,
  ) {}

  //
  async calculatePayroll(query: CalculatePayrollQueryDto) {
    const { month, year, employeeId } = query;

    const targetDate = dayjs.utc(`${year}-${month}-01`);
    const startOfMonth = targetDate.startOf('month').toDate();
    const endOfMonth = targetDate.endOf('month').toDate();

    let targetEmployees: Employee[];

    if (employeeId) {
      const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
      if (!employee) throw new NotFoundException('Employee not found');
      targetEmployees = [employee];

      //
    } else {
      targetEmployees = await this.prisma.employee.findMany({ where: { status: 'ACTIVE' } });
    }

    const payrollConfig = await this.prisma.payrollConfig.findFirst({
      where: { effectiveFrom: { lte: startOfMonth } },
      orderBy: { effectiveFrom: 'desc' },
    });
    if (!payrollConfig) {
      throw new BadRequestException('No payroll configuration found for this period');
    }

    const results = await Promise.all(
      targetEmployees.map((emp) =>
        this.calculatePayslipForEmployee(emp, month, year, startOfMonth, endOfMonth, payrollConfig),
      ),
    );

    return {
      month,
      year,
      created: results.filter((r) => r.status === 'CREATED').length,
      skipped: results.filter((r) => r.status === 'SKIPPED').length,
      results,
    };
  }

  //
  async getAllPayslips(query: PayslipQueryDto) {
    const { page = 1, limit = 20, month, year, departmentId, status } = query;

    const { skip, take } = getPaginationParams(page, limit);

    const where: PayslipWhereInput = {
      ...(month && { month }),
      ...(year && { year }),
      ...(departmentId && { employee: { departmentId } }),
      ...(status && { status }),
    };

    const [data, count] = await Promise.all([
      this.prisma.payslip.findMany({
        where,
        skip,
        take,
        include: { employee: { select: { firstName: true, lastName: true, jobTitle: true } } },
      }),
      this.prisma.payslip.count({ where }),
    ]);

    const meta = buildPaginationMeta(+count, page, limit);

    return { data, meta };
  }

  //
  async getMyPayslips(user: JwtPayloadType, query: MyPayslipQueryDto) {
    const { page = 1, limit = 20, month, year } = query;

    const employee = await this.employeeService.getEmployeeByUser(user.sub);

    const { skip, take } = getPaginationParams(page, limit);

    const where: PayslipWhereInput = {
      employeeId: employee.id,
      status: 'FINALISED',
      ...(month && { month }),
      ...(year && { year }),
    };

    const [data, count] = await Promise.all([
      this.prisma.payslip.findMany({ where, skip, take }),
      this.prisma.payslip.count({ where }),
    ]);

    const meta = buildPaginationMeta(+count, page, limit);

    return { data, meta };
  }

  //
  async changeStatus(payslipId: string, user: JwtPayloadType) {
    const payslip = await this.prisma.payslip.findUnique({ where: { id: payslipId } });
    if (!payslip) throw new NotFoundException('Payslip not found');

    if (payslip.status === 'FINALISED') throw new BadRequestException('Payslip is already finalised');

    const employee = await this.employeeService.getEmployeeByUser(user.sub);

    const payslipFinalised = await this.prisma.payslip.update({
      where: { id: payslipId },
      data: {
        status: 'FINALISED',
        finalisedById: employee.id,
        finalisedAt: new Date(),
      },
    });

    const recipientEmployee = await this.prisma.employee.findUnique({ where: { id: payslip.employeeId } });

    try {
      if (recipientEmployee?.userId) {
        await this.notificationsService.createNotification({
          userId: recipientEmployee.userId,
          title: 'Payslip Ready',
          message: `Your payslip for ${dayjs(payslip.month).format('MMMM YYYY')} has been finalised. Net salary: ${payslip.netSalary}.`,
          type: 'PAYSLIP_FINALISED',
        });
      }

      //
    } catch (err) {
      console.error('Failed to send notification for changeStatus (payslip):', err);
    }

    return payslipFinalised;
  }

  //
  async downloadAsPdf(payslipId: string, user: JwtPayloadType) {
    const payslip = await this.prisma.payslip.findUnique({
      where: { id: payslipId },
      include: {
        employee: {
          select: { firstName: true, lastName: true, jobTitle: true, department: { select: { name: true } } },
        },
        finalisedBy: { select: { firstName: true, lastName: true } },
      },
    });
    if (!payslip) throw new NotFoundException('Payslip not found');

    if (user.role === 'EMPLOYEE') {
      const employee = await this.employeeService.getEmployeeByUser(user.sub);
      if (payslip.employeeId !== employee.id) {
        throw new ForbiddenException('You can only download your own payslip');
      }
    }

    const docDefinition: TDocumentDefinitions = {
      content: [
        { text: 'HR Management System', style: 'company', lineHeight: 2 },
        { text: 'Payslip', style: 'header' },

        { text: `Name: ${payslip.employee.firstName} ${payslip.employee.lastName}`, margin: [0, 10, 0, 3] },
        { text: `Job Title: ${payslip.employee.jobTitle}`, margin: [0, 0, 0, 3] },
        { text: `Department: ${payslip.employee.department?.name ?? '-'}`, margin: [0, 0, 0, 3] },
        { text: `Period: ${payslip.month}/${payslip.year}`, margin: [0, 3, 0, 15] },

        { text: 'Earnings:', style: 'sectionHeader' },
        {
          table: {
            widths: ['*', 'auto'],
            body: [
              ['Base Salary', payslip.baseSalary.toFixed(2)],
              ['Transport Allowance', payslip.transportAllowance.toFixed(2)],
              ['Housing Allowance', payslip.housingAllowance.toFixed(2)],
              ['Medical Allowance', payslip.medicalAllowance.toFixed(2)],
              ['Performance Bonus', payslip.performanceBonus.toFixed(2)],
              ['Overtime Bonus', payslip.overtimeBonus.toFixed(2)],
              [
                { text: 'Gross Salary', bold: true },
                { text: payslip.grossSalary.toFixed(2), bold: true },
              ],
            ],
          },
          margin: [0, 0, 0, 15],
        },

        { text: 'Deductions:', style: 'sectionHeader' },
        {
          table: {
            widths: ['*', 'auto'],
            body: [
              [`Absence (${payslip.absentDays} days)`, payslip.absenceDeduction.toFixed(2)],
              [`Late (${payslip.lateCount} times)`, payslip.lateDeduction.toFixed(2)],
              [`Overdue Tasks (${payslip.overdueTasksCount})`, payslip.overdueDeduction.toFixed(2)],
              ['Tax', payslip.tax.toFixed(2)],
              [
                { text: 'Total Deductions', bold: true },
                { text: payslip.totalDeductions.toFixed(2), bold: true },
              ],
            ],
          },
          margin: [0, 0, 0, 15],
        },

        { text: `Net Salary: ${payslip.netSalary.toFixed(2)}`, style: 'netSalary' },

        payslip.status === 'FINALISED'
          ? {
              text: `Finalised by ${payslip.finalisedBy?.firstName} ${payslip.finalisedBy?.lastName} on ${payslip.finalisedAt?.toDateString()}`,
              style: 'footer',
            }
          : { text: 'Status: DRAFT (not yet finalised)', style: 'footer' },
      ],
      styles: {
        company: { fontSize: 10, color: 'gray' },
        header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
        sectionHeader: { fontSize: 12, bold: true, margin: [0, 5, 0, 5] },
        netSalary: { fontSize: 16, bold: true, margin: [0, 10, 0, 10] },
        footer: { fontSize: 9, color: 'gray', margin: [0, 20, 0, 0] },
      },
      defaultStyle: { font: 'Helvetica' },
    };

    pdfmake.addFonts(fonts);
    const pdf = pdfmake.createPdf(docDefinition);
    const buffer = await pdf.getBuffer();

    const filename =
      `${payslip.employee.firstName}-${payslip.employee.lastName}-payslip-${payslip.month}-${payslip.year}`.replace(
        /\s+/g,
        '-',
      );

    return { buffer, filename };
  }

  //----------------------------
  //
  getConfigs() {
    return this.prisma.payrollConfig.findMany({
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  //
  createConfig(dto: CreatePayrollConfigDto) {
    return this.prisma.payrollConfig.create({ data: dto });
  }

  //----------------------------
  //
  private async calculatePayslipForEmployee(
    employee: Employee,
    month: number,
    year: number,
    startOfMonth: Date,
    endOfMonth: Date,
    payrollConfig: PayrollConfig,
  ) {
    const existingPayslip = await this.prisma.payslip.findUnique({
      where: { employeeId_month_year: { month, year, employeeId: employee.id } },
    });

    if (existingPayslip?.status === 'FINALISED') {
      return { employeeId: employee.id, status: 'SKIPPED', reason: 'Payslip already finalised' };
    }

    if (existingPayslip) {
      await this.prisma.payslip.delete({ where: { id: existingPayslip.id } });
    }

    const [attendanceReport, overdueTasksCount] = await Promise.all([
      this.attendanceService.getMonthlyReport({ employeeId: employee.id, month, year }),
      this.tasksService.getOverdueTasksCount(employee.id, startOfMonth, endOfMonth),
    ]);

    const { absentDays, lateDays: lateCount } = attendanceReport;

    const daysInMonth = dayjs(startOfMonth).daysInMonth();

    const dailyRate = employee.baseSalary / daysInMonth;
    const absenceDeduction = dailyRate * absentDays;
    const lateDeduction = lateCount * payrollConfig.lateDeductionAmount;
    const overdueDeduction =
      overdueTasksCount * (employee.baseSalary * (payrollConfig.overdueTaskDeductionPercent / 100));

    const totalDeductions = absenceDeduction + lateDeduction + overdueDeduction;

    const grossSalary =
      employee.baseSalary +
      payrollConfig.housingAllowance +
      payrollConfig.medicalAllowance +
      payrollConfig.transportAllowance;

    const netSalary = grossSalary - totalDeductions;

    const payslip = await this.prisma.payslip.create({
      data: {
        employeeId: employee.id,
        month,
        year,
        baseSalary: employee.baseSalary,
        transportAllowance: payrollConfig.transportAllowance,
        housingAllowance: payrollConfig.housingAllowance,
        medicalAllowance: payrollConfig.medicalAllowance,
        absentDays,
        absenceDeduction,
        lateCount,
        lateDeduction,
        overdueTasksCount,
        overdueDeduction,
        grossSalary,
        totalDeductions,
        netSalary,
        status: 'DRAFT',
      },
    });

    return { employeeId: employee.id, status: 'CREATED', payslipId: payslip.id };
  }
}

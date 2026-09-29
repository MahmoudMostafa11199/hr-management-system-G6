import { EmployeeService } from 'src/employee/employee.service';
import { PermissionRequestWhereInput } from './../generated/prisma/models/PermissionRequest';
import { Injectable } from '@nestjs/common';
import dayjs from 'dayjs';
import { PrismaService } from 'src/prisma/prisma.service';
import { AttendanceService } from 'src/attendance/attendance.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly employeeService: EmployeeService,
    private readonly attendanceService: AttendanceService,
  ) {}

  async getAdminDashboard() {
    const startOfDay = dayjs().startOf('day').toDate();
    const endOfDay = dayjs().endOf('day').toDate();

    // Kpis
    const [totalEmployees, presentToday, onLeave, pendingRequests] = await Promise.all([
      this.prisma.employee.count({ where: { status: 'ACTIVE' } }),
      this.prisma.attendance.count({
        where: { date: { gte: startOfDay, lte: endOfDay }, status: { in: ['PRESENT', 'LATE'] } },
      }),
      this.prisma.permissionRequest.count({
        where: { startDate: { lte: endOfDay }, endDate: { gte: startOfDay }, status: 'HR_APPROVED' },
      }),
      this.prisma.permissionRequest.count({ where: { status: { in: ['PENDING', 'MANAGER_APPROVED'] } } }),
    ]);

    const [attendanceTrend, departmentHeadcount, recentActivity] = await Promise.all([
      // Attendance Trend
      this.getAttendanceTrend(totalEmployees),
      // Department Head Count
      this.getDepartmentHeadCount(),
      // Recent Activity
      this.getRecentActivity(),
    ]);

    return {
      kpis: { totalEmployees, presentToday, onLeave, pendingRequests },
      attendanceTrend,
      departmentHeadcount,
      recentActivity,
    };
  }

  //
  async getHrDashboard() {
    const [pendingApprovals, leaveBalanceUtilisation, payrollSummary, hiringSummary] = await Promise.all([
      this.getPendingApprovals(),
      this.getLeaveBalanceUtilisation(),
      this.getPayrollSummary(),
      this.getHiringSummary(),
    ]);

    return { pendingApprovals, leaveBalanceUtilisation, payrollSummary, hiringSummary };
  }

  //
  async getManagerDashboard(userId: string) {
    const employee = await this.employeeService.getEmployeeByUser(userId);

    //
    const [teamAttendances, teamTasks, pendingRequests, performance] = await Promise.all([
      this.getTeamAttendance(employee.id),
      this.getTeamTasks(employee.id),
      this.getTeamPendingRequests(employee.id),
      this.getTeamPerformance(employee.id),
    ]);

    return { teamAttendances, teamTasks, pendingRequests, performance };
  }

  //
  async getEmployeeDashboard(userId: string) {
    const employee = await this.employeeService.getEmployeeByUser(userId);

    //
    const [attendance, leaveBalance, tasks, latestPayslip] = await Promise.all([
      this.getMyAttendanceSummary(employee.id),
      this.getMyLeaveBalance(employee.id),
      this.getMyTasks(employee.id),
      this.getMyPayslip(employee.id),
    ]);

    return { attendance, leaveBalance, tasks, latestPayslip };
  }

  ////--------------------------------------
  // ADMIN
  private async getAttendanceTrend(totalEmployees: number) {
    const months = Array.from({ length: 6 }, (_, i) => dayjs().subtract(5 - i, 'month'));

    const trend = await Promise.all(
      months.map(async (targetDate) => {
        const startOfMonth = targetDate.startOf('month').toDate();
        const endOfMonth = targetDate.endOf('month').toDate();
        const daysInMonth = targetDate.daysInMonth();

        const counts = await this.prisma.attendance.groupBy({
          by: ['status'],
          where: {
            date: { gte: startOfMonth, lte: endOfMonth },
            status: { in: ['PRESENT', 'LATE'] },
          },
          _count: true,
        });

        const actualAttendedDays = counts.reduce((sum, count) => sum + count._count, 0);
        const expectedAttendanceDays = daysInMonth * totalEmployees;

        const attendanceRate =
          expectedAttendanceDays > 0 ? Math.round((actualAttendedDays / expectedAttendanceDays) * 100) : 0;

        return {
          month: targetDate.format('MMMM YYYY'),
          attendanceRate,
        };
      }),
    );

    return trend;
  }
  private async getDepartmentHeadCount() {
    const departments = await this.prisma.department.findMany({
      include: { _count: { select: { employees: { where: { status: 'ACTIVE' } } } } },
    });

    return departments.map((dept) => ({ name: dept.name, count: dept._count.employees }));
  }
  private async getLeaveBalanceUtilisation() {
    const currentYear = dayjs().year();

    const departments = await this.prisma.department.findMany({
      include: {
        employees: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            LeaveBalance: { where: { year: currentYear }, select: { balance: true } },
            PermissionRequest: {
              where: {
                status: 'HR_APPROVED',
                leaveType: { name: { not: 'Unpaid Leave' } },
                startDate: { gte: dayjs().startOf('year').toDate() },
              },
              select: { startDate: true, endDate: true },
            },
          },
        },
      },
    });

    return departments.map((dept) => {
      let currentBalance = 0;
      let usedDays = 0;

      for (const employee of dept.employees) {
        currentBalance += employee.LeaveBalance.reduce((sum, b) => sum + b.balance, 0);

        for (const request of employee.PermissionRequest) {
          usedDays += dayjs(request.endDate).diff(dayjs(request.startDate), 'day') + 1;
        }
      }

      const originalBalance = currentBalance + usedDays;
      const utilisationRate = originalBalance > 0 ? Math.round((usedDays / originalBalance) * 100) : 0;

      return {
        department: dept.name,
        utilisationRate,
      };
    });
  }
  private async getRecentActivity() {
    const rows = await this.prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { id: true, type: true, title: true, message: true, link: true, createdAt: true },
    });

    const seen = new Set<string>();

    const recent = rows.filter((r) => {
      const key = `${r.type}|${r.title}|${r.message}|${r.link}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return recent.slice(0, 10);
  }

  // HR
  private async getPendingApprovals() {
    const reqestWhere: PermissionRequestWhereInput = { status: 'MANAGER_APPROVED' };
    const [pendingRequests, count] = await Promise.all([
      this.prisma.permissionRequest.findMany({
        where: reqestWhere,
        take: 5,
        orderBy: { createdAt: 'asc' },
        include: { employee: { select: { firstName: true, lastName: true } }, leaveType: { select: { name: true } } },
      }),
      this.prisma.permissionRequest.count({ where: reqestWhere }),
    ]);

    return {
      count,
      requests: pendingRequests.map((req) => ({
        id: req.id,
        employeeName: `${req.employee.firstName} ${req.employee.lastName}`,
        leaveType: req.leaveType.name,
        startDate: req.startDate,
        endDate: req.endDate,
        requestedAt: req.createdAt,
      })),
    };
  }
  private async getPayrollSummary() {
    const targetDate = dayjs();
    const month = targetDate.month() + 1;
    const year = targetDate.year();

    const result = await this.prisma.payslip.aggregate({
      where: {
        status: 'FINALISED',
        month,
        year,
      },
      _sum: {
        netSalary: true,
        totalDeductions: true,
      },
    });

    return {
      month: targetDate.format('MMMM YYYY'),
      totalPayroll: result._sum.netSalary ?? 0,
      totalDeductions: result._sum.totalDeductions ?? 0,
    };
  }
  private async getHiringSummary() {
    const startOfMonth = dayjs().startOf('month').toDate();
    const endOfMonth = dayjs().endOf('month').toDate();

    const [newHires, terminations] = await Promise.all([
      this.prisma.employee.count({
        where: { hireDate: { gte: startOfMonth, lte: endOfMonth } },
      }),
      this.prisma.employee.count({
        where: { status: 'TERMINATED', updatedAt: { gte: startOfMonth, lte: endOfMonth } },
      }),
    ]);

    return { newHires, terminations };
  }

  // MANAGER
  private async getTeamAttendance(managerId: string) {
    const targetDate = dayjs();
    const startOfDay = targetDate.startOf('day').toDate();
    const endOfDay = targetDate.endOf('day').toDate();

    const employees = await this.prisma.employee.findMany({
      where: { status: 'ACTIVE', department: { managerId } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        jobTitle: true,
        attendance: {
          where: { date: { gte: startOfDay, lte: endOfDay } },
          select: { checkIn: true, checkOut: true, status: true },
        },
      },
    });

    const result = employees.map((emp) => {
      const record = emp.attendance[0];
      const status = record?.status ?? 'ABSENT';

      return {
        employeeId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        status,
        checkIn: record?.checkIn ?? null,
        checkOut: record?.checkOut ?? null,
        isLate: status === 'LATE',
      };
    });

    return {
      totalEmployees: employees.length,
      present: result.filter((e) => e.status === 'PRESENT').length,
      late: result.filter((e) => e.status === 'LATE').length,
      onLeave: result.filter((e) => e.status === 'ON_LEAVE').length,
      absent: result.filter((e) => e.status === 'ABSENT').length,
      employees: result,
    };
  }
  private async getTeamTasks(managerId: string) {
    const now = dayjs();

    const tasks = await this.prisma.task.findMany({
      where: { status: { notIn: ['DONE', 'CLOSED'] }, assignedTo: { department: { managerId } } },
      select: {
        id: true,
        title: true,
        deadline: true,
        priority: true,
        status: true,
        assignedTo: { select: { firstName: true, lastName: true } },
      },
    });

    const result = tasks.map((task) => ({ ...task, isOverdue: dayjs(task.deadline).isBefore(now) }));

    return {
      openCount: result.length,
      overdueCount: result.filter((t) => t.isOverdue).length,
      tasks: result,
    };
  }
  private async getTeamPendingRequests(managerId: string) {
    const requestWhere: PermissionRequestWhereInput = { status: 'PENDING', employee: { department: { managerId } } };

    const [requests, count] = await Promise.all([
      this.prisma.permissionRequest.findMany({
        where: requestWhere,
        take: 5,
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          startDate: true,
          endDate: true,
          reason: true,
          attachment: true,
          status: true,
          createdAt: true,
          employee: { select: { firstName: true, lastName: true, photo: true } },
          leaveType: { select: { name: true } },
        },
      }),
      this.prisma.permissionRequest.count({ where: requestWhere }),
    ]);

    return {
      count,
      requests,
    };
  }
  private async getTeamPerformance(managerId: string) {
    const employees = await this.prisma.employee.findMany({
      where: { status: 'ACTIVE', department: { managerId } },
      select: { id: true, firstName: true, lastName: true },
    });

    const startOfMonth = dayjs().startOf('month').toDate();
    const endOfMonth = dayjs().endOf('month').toDate();
    const now = new Date();

    const scores = await Promise.all(
      employees.map(async (emp) => {
        const [overdueTasksCount, tasksCount, completions, attendance] = await Promise.all([
          this.prisma.task.count({
            where: {
              deadline: { gte: startOfMonth, lte: endOfMonth, lt: now },
              status: { notIn: ['DONE', 'CLOSED'] },
              assignedToId: emp.id,
            },
          }),
          this.prisma.task.count({
            where: { deadline: { gte: startOfMonth, lte: endOfMonth }, assignedToId: emp.id },
          }),
          this.prisma.taskStatusHistory.findMany({
            where: {
              toStatus: 'DONE',
              task: { deadline: { gte: startOfMonth, lte: endOfMonth }, assignedToId: emp.id },
            },
            include: { task: { select: { deadline: true } } },
          }),
          this.attendanceService.getMonthlyReport({
            employeeId: emp.id,
            month: dayjs().month() + 1,
            year: dayjs().year(),
          }),
        ]);

        const onTimeCount = completions.filter((c) => dayjs(c.changedAt).isBefore(dayjs(c.task.deadline))).length;
        const onTimeRate = completions.length > 0 ? Math.round((onTimeCount / completions.length) * 100) : 0;
        const overdueRate = tasksCount > 0 ? Math.round((overdueTasksCount / tasksCount) * 100) : 0;
        const attendanceRate =
          attendance.totalRecorded > 0
            ? Math.round(((attendance.presentDays + attendance.lateDays) / attendance.totalRecorded) * 100)
            : 0;

        const performanceScore = Math.round((onTimeRate + attendanceRate + (100 - overdueRate)) / 3);

        return {
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          onTimeRate,
          overdueRate,
          attendanceRate,
          performanceScore,
        };
      }),
    );

    const averageScore =
      scores.length > 0 ? Math.round(scores.reduce((sum, s) => sum + s.performanceScore, 0) / scores.length) : 0;
    const onTimeRate =
      scores.length > 0 ? Math.round(scores.reduce((sum, s) => sum + s.onTimeRate, 0) / scores.length) : 0;
    const attendanceRate =
      scores.length > 0 ? Math.round(scores.reduce((sum, s) => sum + s.attendanceRate, 0) / scores.length) : 0;

    const topPerformers = [...scores].sort((a, b) => b.performanceScore - a.performanceScore).slice(0, 3);

    return { averageScore, onTimeRate, attendanceRate, topPerformers, employees: scores };
  }

  // EMPLOYEE
  private async getMyAttendanceSummary(employeeId: string) {
    const targetDate = dayjs();
    const startOfMonth = targetDate.startOf('month').toDate();
    const endOfMonth = targetDate.endOf('month').toDate();

    const attendances = await this.prisma.attendance.findMany({
      where: { employeeId, date: { gte: startOfMonth, lte: endOfMonth } },
      select: { date: true, status: true, checkIn: true, checkOut: true },
      orderBy: { date: 'asc' },
    });

    const summary = {
      totalRecorded: attendances.length,
      presentDays: attendances.filter((att) => att.status === 'PRESENT').length,
      lateDays: attendances.filter((att) => att.status === 'LATE').length,
      absentDays: attendances.filter((att) => att.status === 'ABSENT').length,
      onLeaveDays: attendances.filter((att) => att.status === 'ON_LEAVE').length,
    };

    const todayRecord = attendances.find((att) => dayjs(att.date).isSame(targetDate, 'day'));

    return {
      month: targetDate.format('MMMM YYYY'),
      ...summary,
      today: {
        checkIn: todayRecord?.checkIn ?? null,
        status: todayRecord?.status ?? 'ABSENT',
        checkOut: todayRecord?.checkOut ?? null,
      },
      attendances,
    };
  }
  private async getMyLeaveBalance(employeeId: string) {
    const currentYear = dayjs().year();
    const startOfYear = dayjs().startOf('year').toDate();

    const balances = await this.prisma.leaveBalance.findMany({
      where: { employeeId, year: currentYear },
      select: {
        balance: true,
        leaveType: { select: { id: true, name: true } },
      },
    });

    const requests = await this.prisma.permissionRequest.findMany({
      where: {
        employeeId,
        status: 'HR_APPROVED',
        startDate: { gte: startOfYear },
      },
      select: { startDate: true, endDate: true, leaveTypeId: true },
    });

    const result: Record<string, { total: number; used: number; remaining: number }> = {};

    for (const b of balances) {
      const usedDays = requests
        .filter((r) => r.leaveTypeId === b.leaveType.id)
        .reduce((sum, r) => sum + (dayjs(r.endDate).diff(dayjs(r.startDate), 'day') + 1), 0);

      const total = b.balance + usedDays;

      result[b.leaveType.name] = {
        total,
        used: usedDays,
        remaining: b.balance,
      };
    }

    return result;
  }

  private async getMyTasks(employeeId: string) {
    const today = dayjs();
    const tasks = await this.prisma.task.findMany({
      where: {
        assignedToId: employeeId,
      },
    });

    return {
      todoCount: tasks.filter((t) => t.status === 'TO_DO').length,
      inProgressCount: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
      underReviewCount: tasks.filter((t) => t.status === 'UNDER_REVIEW').length,
      overdueCount: tasks.filter((t) => !['DONE', 'CLOSED'].includes(t.status) && dayjs(t.deadline).isBefore(today))
        .length,
      tasks: tasks.filter((t) => !['DONE', 'CLOSED'].includes(t.status)),
    };
  }
  private async getMyPayslip(employeeId: string) {
    const payslip = await this.prisma.payslip.findFirst({
      where: { employeeId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      select: {
        id: true,
        month: true,
        year: true,
        baseSalary: true,
        totalDeductions: true,
        netSalary: true,
        status: true,
        finalisedAt: true,
      },
    });

    if (!payslip) return null;

    return {
      ...payslip,
      month: dayjs(`${payslip.year}-${payslip.month}-01`).format('MMMM YYYY'),
    };
  }
}

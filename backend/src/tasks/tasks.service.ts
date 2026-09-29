import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ALLOWED_TRANSITIONS } from 'src/common/allowed-transition';
import { buildPaginationMeta, getPaginationParams } from 'src/common/pagination-helper';
import { Prisma, TaskStatus } from 'src/generated/prisma/client';
import { TaskInclude } from 'src/generated/prisma/models';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtPayloadType } from 'src/utils/types';
import { CreateTaskDto } from './dtos/create-task.dto';
import { MyTaskQueryDto } from './dtos/my-task-query.dto';
import { TaskQueryDto } from './dtos/task-query.dto';
import { UpdateTaskStatusDto } from './dtos/update-task-status.dto';
import { CreateTaskCommentDto } from './dtos/create-task-comment.dto';
import { EmployeeService } from 'src/employee/employee.service';
import { ReportQueryDto } from './dtos/report-query.dto';
import dayjs from 'dayjs';
import { AttendanceService } from 'src/attendance/attendance.service';
import { NotificationsService } from 'src/notifications/notifications.service';

const employeeInclude = { firstName: true, lastName: true, jobTitle: true, user: { select: { role: true } } };

const taskInclude = {
  comments: { select: { content: true, author: { select: employeeInclude }, createdAt: true } },
  assignedTo: { select: employeeInclude },
  createdBy: { select: employeeInclude },
  attachments: { select: { originalName: true, fileUrl: true } },
} satisfies TaskInclude;

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly employeeService: EmployeeService,
    private readonly attendanceService: AttendanceService,
    private readonly notificationsService: NotificationsService,
  ) {}

  //
  async createTask(
    dto: CreateTaskDto,
    user: JwtPayloadType,
    attachments: { fileName: string; originalName: string; fileUrl: string }[],
  ) {
    const employeeAssigned = await this.prisma.employee.findUnique({ where: { id: dto.assignedToId } });
    if (!employeeAssigned) throw new NotFoundException('Employee assigned profile not found');

    const employeeCreated = await this.prisma.employee.findUnique({ where: { userId: user.sub } });
    if (!employeeCreated) throw new NotFoundException('Employee created profile not found');

    const task = await this.prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          ...dto,
          status: 'TO_DO',
          createdById: employeeCreated.id,
        },
      });

      if (attachments?.length) {
        await tx.taskAttachment.createMany({
          data: attachments.map((att) => ({
            taskId: task.id,
            fileName: att.fileName,
            originalName: att.originalName,
            fileUrl: att.fileUrl,
          })),
        });
      }

      try {
        await this.notificationsService.createNotification({
          userId: employeeAssigned.userId,
          title: 'New Task Assigned',
          message: `You have been assigned a new task: "${task.title}"${task.deadline ? ` (due ${dayjs(task.deadline).format('YYYY-MM-DD')})` : ''}.`,
          type: 'TASK_ASSIGNED',
        });
      } catch (err) {
        console.error('Failed to send notification for createTask:', err);
      }

      return task;
    });

    await this.notificationsService.createNotification({
      userId: dto.assignedToId,
      title: 'New Task Assigned',
      message: `You have been assigned a new task: "${task.title}"${task.deadline ? ` (due ${dayjs(task.deadline).format('YYYY-MM-DD')})` : ''}.`,
      type: 'TASK_ASSIGNED',
    });

    return task;
  }

  //
  async getTasks(query: TaskQueryDto) {
    const { page = 1, limit = 20, status, employeeId } = query;

    const where: Prisma.TaskWhereInput = {
      ...(status && { status }),
      ...(employeeId && { assignedToId: employeeId }),
    };

    const { skip, take } = getPaginationParams(page, limit);

    const [data, count] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        skip,
        take,
        include: taskInclude,
      }),

      this.prisma.task.count({ where }),
    ]);

    return { data, meta: buildPaginationMeta(+count, page, limit) };
  }

  //
  async getTask(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id }, include: taskInclude });
    if (!task) throw new NotFoundException('Task not found');

    return task;
  }

  //
  async getMyTasks(user: JwtPayloadType, query: MyTaskQueryDto) {
    const { page = 1, limit = 20, status } = query;

    const employee = await this.employeeService.getEmployeeByUser(user.sub);

    const where: Prisma.TaskWhereInput = {
      ...(status && { status }),
      assignedToId: employee.id,
    };

    const { skip, take } = getPaginationParams(page, limit);

    const [data, count] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        skip,
        take,
        include: taskInclude,
      }),

      this.prisma.task.count({ where }),
    ]);

    return { data, meta: buildPaginationMeta(+count, page, limit) };
  }

  //
  async changeStatus(id: string, user: JwtPayloadType, dto: UpdateTaskStatusDto) {
    const task = await this.getTask(id);
    const oldStatus = task.status;

    const employee = await this.employeeService.getEmployeeByUser(user.sub);

    if (task.assignedToId !== employee.id) throw new ForbiddenException('Only the assignee can update task status');

    this.validateTransition(oldStatus, dto.status);

    const updatedTask = await this.prisma.$transaction(async (tx) => {
      const task = await tx.task.update({ where: { id }, data: { status: dto.status } });

      await tx.taskStatusHistory.create({
        data: {
          taskId: task.id,
          fromStatus: oldStatus,
          toStatus: dto.status,
          changedById: employee.id,
        },
      });

      return task;
    });

    const creator = await this.prisma.employee.findUnique({ where: { id: task.createdById } });

    try {
      if (creator?.userId) {
        await this.notificationsService.createNotification({
          userId: creator.userId,
          title: 'Task Status Updated',
          message: `${employee.firstName} ${employee.lastName} changed the status of "${task.title}" to ${dto.status}.`,
          type: 'TASK_STATUS_CHANGED',
        });
      }

      //
    } catch (err) {
      console.error('Failed to send notification for changeStatus', err);
    }

    return updatedTask;
  }

  //
  async addComments(taskId: string, userId: string, dto: CreateTaskCommentDto) {
    const task = await this.getTask(taskId);

    const employeeCommenter = await this.employeeService.getEmployeeByUser(userId);

    const isAssigned = employeeCommenter.id === task.assignedToId || employeeCommenter.id === task.createdById;
    if (!isAssigned) throw new ForbiddenException('Only users assigned to this task can comment');

    const updatedTask = await this.prisma.taskComment.create({
      data: {
        taskId,
        content: dto.content,
        authorId: employeeCommenter.id,
      },
    });

    const commenterEmployeeId = employeeCommenter.id;
    const recipientEmployeeId = commenterEmployeeId === task.assignedToId ? task.createdById : task.assignedToId;
    const recipientEmployee = await this.prisma.employee.findUnique({ where: { id: recipientEmployeeId } });

    try {
      await this.notificationsService.createNotification({
        userId: recipientEmployee!.userId,
        title: 'New Comment On Task',
        message: `${employeeCommenter.firstName} ${employeeCommenter.lastName} commented on task "${task.title}": "${dto.content.length > 80 ? dto.content.slice(0, 80) + '...' : dto.content}"`,
        type: 'TASK_COMMENT',
      });
    } catch (err) {
      console.error('Failed to send notification for addComments:', err);
    }

    return updatedTask;
  }

  //
  async getReport(user: JwtPayloadType, query: ReportQueryDto) {
    const { month, year } = query;

    const targetDate = month && year ? dayjs(`${year}-${month}-01`) : dayjs();
    const startOfMonth = targetDate.startOf('month').toDate();
    const endOfMonth = targetDate.endOf('month').toDate();
    const now = new Date();

    const employee = await this.employeeService.getEmployeeByUser(user.sub);

    let assignedToFilter: { departmentId: string } | undefined;

    if (user.role === 'MANAGER') {
      const managedDept = await this.prisma.department.findUnique({ where: { managerId: employee.id } });
      if (!managedDept) throw new ForbiddenException('You do not manage a department');

      assignedToFilter = { departmentId: managedDept.id };
    }

    const overdueWhere: Prisma.TaskWhereInput = {
      deadline: { gte: startOfMonth, lte: endOfMonth, lt: now },
      status: { notIn: ['DONE', 'CLOSED'] },
      assignedTo: assignedToFilter,
    };

    const [overdueTasks, total, completed] = await Promise.all([
      this.prisma.task.findMany({
        where: overdueWhere,
        include: { assignedTo: { select: { firstName: true, lastName: true } } },
      }),
      this.prisma.task.count({
        where: { deadline: { gte: startOfMonth, lte: endOfMonth }, assignedTo: assignedToFilter },
      }),
      this.prisma.task.count({
        where: {
          deadline: { gte: startOfMonth, lte: endOfMonth },
          status: { in: ['DONE', 'CLOSED'] },
          assignedTo: assignedToFilter,
        },
      }),
    ]);

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      month: targetDate.month() + 1,
      year: targetDate.year(),
      overdue: { tasks: overdueTasks, count: overdueTasks.length },
      completionRate,
    };
  }

  //
  async getPerformanceScore(user: JwtPayloadType, query: ReportQueryDto, employeeId?: string) {
    const { month, year } = query;

    const targetDate = month && year ? dayjs(`${year}-${month}-01`) : dayjs();
    const startOfMonth = targetDate.startOf('month').toDate();
    const endOfMonth = targetDate.endOf('month').toDate();
    const now = new Date();

    const employee = await this.employeeService.getEmployeeByUser(user.sub);

    const targetEmployeeId = employeeId ?? employee.id;

    const targetEmployee = await this.prisma.employee.findUnique({ where: { id: targetEmployeeId } });
    if (!targetEmployee) throw new NotFoundException('Employee not found');

    if (user.role === 'MANAGER') {
      const managedDept = await this.prisma.department.findUnique({ where: { managerId: employee.id } });
      if (!managedDept || managedDept.id !== targetEmployee.departmentId)
        throw new ForbiddenException('You are not the manager of this employee');
    }

    const overdueWhere: Prisma.TaskWhereInput = {
      deadline: { gte: startOfMonth, lte: endOfMonth, lt: now },
      status: { notIn: ['DONE', 'CLOSED'] },
      assignedToId: targetEmployeeId,
    };

    const [overdueTasks, tasksCount, completions, attendanceReport] = await Promise.all([
      this.prisma.task.findMany({
        where: overdueWhere,
        include: { assignedTo: { select: { firstName: true, lastName: true } } },
      }),
      this.prisma.task.count({
        where: { deadline: { gte: startOfMonth, lte: endOfMonth }, assignedToId: targetEmployeeId },
      }),
      this.prisma.taskStatusHistory.findMany({
        where: {
          toStatus: 'DONE',
          task: { deadline: { gte: startOfMonth, lte: endOfMonth }, assignedToId: targetEmployeeId },
        },
        include: { task: { select: { deadline: true } } },
      }),
      this.attendanceService.getMonthlyReport({
        employeeId: targetEmployeeId,
        month: targetDate.month() + 1,
        year: targetDate.year(),
      }),
    ]);

    let onTimeCount = 0;
    for (const entry of completions) {
      if (entry.changedAt <= entry.task.deadline) onTimeCount++;
    }

    const onTimeRate = completions.length > 0 ? Math.round((onTimeCount / completions.length) * 100) : 0;
    const overdueRate = tasksCount > 0 ? Math.round((overdueTasks.length / tasksCount) * 100) : 0;
    const attendanceRate =
      attendanceReport.totalRecorded > 0
        ? Math.round(
            ((attendanceReport.presentDays + attendanceReport.lateDays) / attendanceReport.totalRecorded) * 100,
          )
        : 0;

    const performanceScore = Math.round((onTimeRate + attendanceRate + (100 - overdueRate)) / 3);

    return {
      employeeId: targetEmployeeId,
      month: targetDate.month() + 1,
      year: targetDate.year(),
      onTimeRate,
      overdueRate,
      attendanceRate,
      performanceScore,
    };
  }

  //
  async getOverdueTasksCount(employeeId: string, startOfMonth: Date, endOfMonth: Date) {
    return this.prisma.task.count({
      where: {
        assignedToId: employeeId,
        deadline: { gte: startOfMonth, lte: endOfMonth, lt: new Date() },
        status: { notIn: ['DONE', 'CLOSED'] },
      },
    });
  }

  //
  private validateTransition(current: TaskStatus, next: TaskStatus) {
    const allowed = ALLOWED_TRANSITIONS[current];

    if (current === next) throw new BadRequestException('Task is already in this status');

    if (!allowed.includes(next)) throw new BadRequestException(`Cannot move from ${current} to ${next}`);
  }
}

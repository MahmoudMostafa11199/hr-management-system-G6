import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import dayjs from 'dayjs';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtPayloadType } from 'src/utils/types';
import { CreatePermissionDto } from './dtos/create-permission.dto';
import { ManagerActionDto, ManagerDecision } from './dtos/manager-action.dto';
import { PermissionStatus } from 'src/generated/prisma/enums';
import { HrActionDto } from './dtos/hr-action.dto';
import { GetPermissionQueryDto } from './dtos/permission-query.dto';
import { buildPaginationMeta, getPaginationParams } from 'src/common/pagination-helper';
import { Prisma } from 'src/generated/prisma/client';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';
import { NotificationsService } from 'src/notifications/notifications.service';
import { PermissionRequestGetPayload } from 'src/generated/prisma/models';

@Injectable()
export class PermissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  //
  async createPermissionRequest(userId: string, dto: CreatePermissionDto) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId },
      include: { department: { select: { manager: { select: { userId: true } } } } },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const leaveType = await this.prisma.leaveType.findUnique({ where: { id: dto.leaveTypeId } });
    if (!leaveType) throw new NotFoundException('LeaveType not found');

    const startOfDate = dayjs(dto.startDate);
    const endOfDate = dayjs(dto.endDate);

    if (endOfDate.isBefore(startOfDate)) {
      throw new BadRequestException('End date must be after or equal to start date');
    }

    if (leaveType.maxDurationDays) {
      const days = endOfDate.diff(startOfDate, 'day') + 1;

      if (days > leaveType.maxDurationDays) {
        throw new BadRequestException(
          `Requested duration (${days} days) exceeds maximum allowed (${leaveType.maxDurationDays} days) for ${leaveType.name}`,
        );
      }
    }

    const request = await this.prisma.permissionRequest.create({
      data: {
        ...dto,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        status: 'PENDING',
        employeeId: employee.id,
      },
    });

    try {
      const managerUserId = employee.department?.manager?.userId;
      if (managerUserId) {
        await this.notificationsService.createNotification({
          userId: managerUserId,
          title: 'New Permission Request',
          message: `${employee.firstName} ${employee.lastName} requested ${leaveType.name} from ${dto.startDate} to ${dto.endDate}`,
          type: 'PERMISSION_REQUEST',
        });
      }

      //
    } catch (err) {
      console.error('Failed to send notification for permission request:', err);
    }

    return request;
  }

  //
  async managerAction(permissionId: string, user: JwtPayloadType, dto: ManagerActionDto) {
    const permissionRequest = await this.getPermissionRequest(permissionId);
    if (permissionRequest.status !== 'PENDING') throw new BadRequestException('Request already processed');

    await this.checkManagerAuthorization(permissionRequest.employeeId, user.sub);

    let newStatus: PermissionStatus;
    if (dto.decision === ManagerDecision.REJECT) {
      newStatus = 'REJECTED';
    } else {
      const leaveType = await this.prisma.leaveType.findUnique({ where: { id: permissionRequest.leaveTypeId } });
      newStatus = leaveType?.requiresHrApproval ? 'MANAGER_APPROVED' : 'HR_APPROVED';
    }

    const request = await this.prisma.permissionRequest.update({
      where: { id: permissionId },
      data: {
        status: newStatus,
        managerComment: dto.comment,
        managerActionAt: new Date(),
      },
      include: {
        employee: true,
        leaveType: true,
      },
    });

    try {
      if (newStatus === 'REJECTED' || newStatus === 'HR_APPROVED') {
        if (request?.employee?.userId) {
          await this.notificationsService.createNotification({
            userId: request.employee.userId,
            title: `Permission Request ${dto.decision === ManagerDecision.REJECT ? 'Rejected' : 'Approved'}`,
            message:
              dto.decision === ManagerDecision.REJECT
                ? `Your ${request.leaveType.name} request (${dayjs(request.startDate).format('YYYY-MM-DD')} - ${dayjs(request.endDate).format('YYYY-MM-DD')}) has been rejected.`
                : `Your ${request.leaveType.name} request (${dayjs(request.startDate).format('YYYY-MM-DD')} - ${dayjs(request.endDate).format('YYYY-MM-DD')}) has been approved.`,
            type: dto.decision === ManagerDecision.REJECT ? 'PERMISSION_REJECTED' : 'PERMISSION_APPROVED',
          });
        }
      } else if (newStatus === 'MANAGER_APPROVED') {
        const hrUsers = await this.prisma.user.findMany({ where: { role: 'HR' }, select: { id: true } });

        await Promise.all(
          hrUsers.map((hr) =>
            this.notificationsService.createNotification({
              userId: hr.id,
              title: 'Permission Request Awaiting HR Approval',
              message: `${request.employee.firstName} ${request.employee.lastName} has a ${request.leaveType.name} request pending your approval.`,
              type: 'PERMISSION_REQUEST',
            }),
          ),
        );
      }
      //
    } catch (err) {
      console.error('Failed to send notification for managerAction:', err);
    }

    return request;
  }

  //
  async hrAction(permissionId: string, user: JwtPayloadType, dto: HrActionDto) {
    const permissionRequest = await this.getPermissionRequest(permissionId);
    if (permissionRequest.status !== 'MANAGER_APPROVED') throw new BadRequestException('Request already processed');

    let newStatus: PermissionStatus;
    let request: PermissionRequestGetPayload<{
      include: { employee: true; leaveType: true };
    }>;
    if (dto.decision === ManagerDecision.REJECT) {
      newStatus = 'REJECTED';

      request = await this.prisma.permissionRequest.update({
        where: { id: permissionId },
        data: {
          status: newStatus,
          hrComment: dto.comment,
          hrActionAt: new Date(),
        },
        include: { employee: true, leaveType: true },
      });
    } else {
      newStatus = 'HR_APPROVED';

      const leaveType = await this.prisma.leaveType.findUnique({ where: { id: permissionRequest.leaveTypeId } });
      if (!leaveType) throw new NotFoundException('Leave type not found');

      const isUnpaid = leaveType.name === 'Unpaid Leave';

      const startOfDate = dayjs(permissionRequest.startDate);
      const endOfDate = dayjs(permissionRequest.endDate);
      const days = endOfDate.diff(startOfDate, 'day') + 1;

      request = await this.prisma.$transaction(async (tx) => {
        if (!isUnpaid) {
          const year = startOfDate.year();

          const leaveBalance = await tx.leaveBalance.findUnique({
            where: {
              employeeId_leaveTypeId_year: {
                employeeId: permissionRequest.employeeId,
                leaveTypeId: permissionRequest.leaveTypeId,
                year,
              },
            },
          });
          if (!leaveBalance || leaveBalance.balance < days) throw new BadRequestException('Insufficient leave balance');

          await tx.leaveBalance.update({
            where: {
              employeeId_leaveTypeId_year: {
                employeeId: permissionRequest.employeeId,
                leaveTypeId: permissionRequest.leaveTypeId,
                year,
              },
            },
            data: {
              balance: leaveBalance.balance - days,
            },
          });
        }

        // Update Permission request
        const updated = await tx.permissionRequest.update({
          where: { id: permissionId },
          data: {
            status: newStatus,
            hrComment: dto.comment,
            hrActionAt: new Date(),
          },
          include: { employee: true, leaveType: true },
        });

        // Attendance Registration
        let currentDate = startOfDate;
        while (currentDate.isBefore(endOfDate) || currentDate.isSame(endOfDate, 'day')) {
          const dayOfWeek = currentDate.day();
          if (dayOfWeek !== 5 && dayOfWeek !== 6) {
            await tx.attendance.upsert({
              where: { employeeId_date: { date: currentDate.toDate(), employeeId: permissionRequest.employeeId } },
              update: { status: 'ON_LEAVE' },
              create: {
                date: currentDate.toDate(),
                status: 'ON_LEAVE',
                employeeId: permissionRequest.employeeId,
                markedById: user.sub,
                shiftId: null,
              },
            });
          }

          currentDate = currentDate.add(1, 'day');
        }

        return updated;
      });
    }

    // Send Notification
    try {
      if (request.employee.userId) {
        await this.notificationsService.createNotification({
          userId: request.employee.userId,
          title: `Permission Request ${dto.decision === ManagerDecision.REJECT ? 'Rejected' : 'Approved'}`,
          message:
            dto.decision === ManagerDecision.REJECT
              ? `Your ${request.leaveType.name} request (${dayjs(request.startDate).format('YYYY-MM-DD')} - ${dayjs(request.endDate).format('YYYY-MM-DD')}) has been rejected.`
              : `Your ${request.leaveType.name} request (${dayjs(request.startDate).format('YYYY-MM-DD')} - ${dayjs(request.endDate).format('YYYY-MM-DD')}) has been approved.`,
          type: dto.decision === ManagerDecision.REJECT ? 'PERMISSION_REJECTED' : 'PERMISSION_APPROVED',
        });
      }

      //
    } catch (err) {
      console.error('Failed to send notification for hrAction:', err);
    }

    return request;
  }

  //
  async getPermissionRequest(id: string) {
    const permissionRequest = await this.prisma.permissionRequest.findUnique({ where: { id } });
    if (!permissionRequest) throw new NotFoundException('Permission request not found');

    return permissionRequest;
  }

  //
  async getPermissionRequests(query: GetPermissionQueryDto, user: JwtPayloadType) {
    const { page = 1, limit = 20, status, leaveTypeId } = query;

    const where: Prisma.PermissionRequestWhereInput = {
      ...(status && { status }),
      ...(leaveTypeId && { leaveTypeId }),
    };

    const { skip, take } = getPaginationParams(page, limit);

    if (user.role === 'MANAGER') {
      const employee = await this.prisma.employee.findUnique({
        where: { userId: user.sub },
        include: { managedDepartment: true },
      });

      where.employee = { departmentId: employee?.managedDepartment?.id };
    }

    const [data, count] = await this.prisma.$transaction([
      this.prisma.permissionRequest.findMany({ where, skip, take, include: { leaveType: true } }),

      this.prisma.permissionRequest.count({ where }),
    ]);

    return { data, meta: buildPaginationMeta(count, page, limit) };
  }

  //
  async getMyPermission(user: JwtPayloadType, query: PaginationQueryDto) {
    const { page = 1, limit = 20 } = query;

    const employee = await this.prisma.employee.findUnique({ where: { userId: user.sub } });
    if (!employee) throw new NotFoundException('Employee not found');

    const where: Prisma.PermissionRequestWhereInput = { employeeId: employee.id };

    const { skip, take } = getPaginationParams(page, limit);

    const [data, count] = await this.prisma.$transaction([
      this.prisma.permissionRequest.findMany({ where, skip, take, include: { employee: true, leaveType: true } }),

      this.prisma.permissionRequest.count({ where }),
    ]);

    return { data, meta: buildPaginationMeta(count, page, limit) };
  }

  //
  async removePermissionRequest(id: string, user: JwtPayloadType) {
    const employee = await this.prisma.employee.findUnique({ where: { userId: user.sub } });
    if (!employee) throw new BadRequestException('Employee not found');

    const permissionRequest = await this.prisma.permissionRequest.findUnique({
      where: { id, employeeId: employee.id },
    });
    if (!permissionRequest) throw new NotFoundException('Permission request not found');

    if (permissionRequest.status !== 'PENDING')
      throw new BadRequestException(`Cannot cancel request with status ${permissionRequest.status}`);

    await this.prisma.permissionRequest.update({
      where: { id, employeeId: employee.id },
      data: { status: 'CANCELLED' },
    });

    return { message: 'Permission request cancelled successfully' };
  }

  //
  private async checkManagerAuthorization(employeeId: string, managerId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { department: { select: { managerId: true } } },
    });

    if (!employee) throw new NotFoundException('Employee not found');

    const managerEmployee = await this.prisma.employee.findUnique({ where: { userId: managerId } });
    if (!managerEmployee || managerEmployee.id !== employee.department?.managerId) {
      throw new ForbiddenException('You are not authorized to act on this request');
    }
  }
}

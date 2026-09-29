import { Injectable, NotFoundException } from '@nestjs/common';
import { buildPaginationMeta, getPaginationParams } from 'src/common/pagination-helper';
import { NotificationWhereInput } from 'src/generated/prisma/models';
import { PrismaService } from 'src/prisma/prisma.service';
import { GetNotificationsQueryDto } from './dtos/get-notifications-query.dto';
import { Prisma } from 'src/generated/prisma/client';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
  ) {}

  //
  async createNotification(dto: Prisma.NotificationUncheckedCreateInput) {
    const notification = await this.prisma.notification.create({ data: dto });

    this.gateway.server.to(`user:${dto.userId}`).emit('notification', notification);

    return notification;
  }

  //
  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id: notificationId, userId } });
    if (!notification) throw new NotFoundException('Notification not found');

    return this.prisma.notification.update({ where: { id: notificationId, userId }, data: { isRead: true } });
  }

  //
  markAllRead(userId: string) {
    return this.prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
  }

  //
  async getNotifications(userId: string, query: GetNotificationsQueryDto) {
    const { isRead, page = 1, limit = 20 } = query;

    const { skip, take } = getPaginationParams(page, limit);

    const where: NotificationWhereInput = {
      userId,
      ...(isRead !== undefined && { isRead }),
    };

    const [data, count] = await Promise.all([
      this.prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      this.prisma.notification.count({ where }),
    ]);
    const meta = buildPaginationMeta(+count, page, limit);

    return { data, meta };
  }
}

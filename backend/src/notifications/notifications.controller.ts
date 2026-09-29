import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { CurrentUser } from 'src/user/decorators/current-user.decorator';
import type { JwtPayloadType } from 'src/utils/types';
import { GetNotificationsQueryDto } from './dtos/get-notifications-query.dto';
import { NotificationsService } from './notifications.service';
import { ApiCookieAuth, ApiForbiddenResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

@ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
@ApiForbiddenResponse({ description: 'Insufficient role permissions' })
@ApiTags('Notification')
@ApiCookieAuth('token')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationService: NotificationsService) {}

  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @CurrentUser() user: JwtPayloadType) {
    return this.notificationService.markAsRead(user.sub, id);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser() user: JwtPayloadType) {
    return this.notificationService.markAllRead(user.sub);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayloadType, @Query() query: GetNotificationsQueryDto) {
    return this.notificationService.getNotifications(user.sub, query);
  }
}

import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PermissionController } from './permission.controller';
import { PermissionService } from './permission.service';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  providers: [PermissionService],
  controllers: [PermissionController],
})
export class PermissionModule {}

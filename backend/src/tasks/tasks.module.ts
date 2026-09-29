import { Module } from '@nestjs/common';
import { EmployeeModule } from 'src/employee/employee.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UploadsModule } from 'src/uploads/uploads.module';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { AttendanceModule } from 'src/attendance/attendance.module';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [PrismaModule, UploadsModule, EmployeeModule, AttendanceModule, NotificationsModule],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}

import { Module } from '@nestjs/common';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AttendanceModule } from 'src/attendance/attendance.module';
import { TasksModule } from 'src/tasks/tasks.module';
import { EmployeeModule } from 'src/employee/employee.module';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [PrismaModule, AttendanceModule, TasksModule, EmployeeModule, NotificationsModule],
  controllers: [PayrollController],
  providers: [PayrollService],
})
export class PayrollModule {}

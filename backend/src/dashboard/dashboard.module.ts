import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { EmployeeModule } from 'src/employee/employee.module';
import { TasksModule } from 'src/tasks/tasks.module';
import { AttendanceModule } from 'src/attendance/attendance.module';

@Module({
  imports: [PrismaModule, EmployeeModule, TasksModule, AttendanceModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}

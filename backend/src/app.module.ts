import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { EmployeeModule } from './employee/employee.module';
import { DepartmentModule } from './department/department.module';
import { AttendanceModule } from './attendance/attendance.module';
import { UploadsModule } from './uploads/uploads.module';
import { ShiftConfigModule } from './shift-config/shift-config.module';
import { PermissionModule } from './permission/permission.module';
import { LeaveTypeModule } from './leave-type/leave-type.module';
import { LeaveBalanceModule } from './leave-balance/leave-balance.module';
import { TasksModule } from './tasks/tasks.module';
import { PayrollModule } from './payroll/payroll.module';
import { MailService } from './mail/mail.service';
import { MailModule } from './mail/mail.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    PrismaModule,
    UserModule,
    AuthModule,
    EmployeeModule,
    DepartmentModule,
    ConfigModule.forRoot({ isGlobal: true }),
    AttendanceModule,
    UploadsModule,
    ShiftConfigModule,
    PermissionModule,
    LeaveTypeModule,
    LeaveBalanceModule,
    TasksModule,
    PayrollModule,
    MailModule,
    NotificationsModule,
    DashboardModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [AppService, MailService],
})
export class AppModule {}

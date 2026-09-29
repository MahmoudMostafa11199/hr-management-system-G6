import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { EmployeeController } from './employee.controller';
import { EmployeeService } from './employee.service';
import { UploadsModule } from 'src/uploads/uploads.module';

@Module({
  imports: [AuthModule, PrismaModule, UploadsModule],
  providers: [EmployeeService],
  controllers: [EmployeeController],
  exports: [EmployeeService],
})
export class EmployeeModule {}

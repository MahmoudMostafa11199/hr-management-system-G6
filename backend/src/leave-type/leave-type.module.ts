import { Module } from '@nestjs/common';
import { LeaveTypeService } from './leave-type.service';
import { LeaveTypeController } from './leave-type.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [LeaveTypeService],
  controllers: [LeaveTypeController],
})
export class LeaveTypeModule {}

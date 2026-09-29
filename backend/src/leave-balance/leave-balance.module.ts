import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { LeaveBalanceController } from './leave-balance.controller';
import { LeaveBalanceService } from './leave-balance.service';

@Module({
  imports: [PrismaModule],
  providers: [LeaveBalanceService],
  controllers: [LeaveBalanceController],
})
export class LeaveBalanceModule {}

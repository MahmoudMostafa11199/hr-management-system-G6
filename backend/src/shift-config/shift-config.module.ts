import { Module } from '@nestjs/common';
import { ShiftConfigController } from './shift-config.controller';
import { ShiftConfigService } from './shift-config.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ShiftConfigController],
  providers: [ShiftConfigService],
})
export class ShiftConfigModule {}

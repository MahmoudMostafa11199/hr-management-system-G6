import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ShiftConfig } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateShiftConfigDto } from './dtos/create-shift-config.dto';
import { UpdateShiftConfigDto } from './dtos/update-shift-config.dto';

@Injectable()
export class ShiftConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async createShift(dto: CreateShiftConfigDto): Promise<ShiftConfig> {
    const existing = await this.prisma.shiftConfig.findFirst({ where: { name: dto.name } });
    if (existing) throw new ConflictException('Shift with this name already exists');

    return this.prisma.shiftConfig.create({ data: dto });
  }

  async updateShift(id: string, dto: UpdateShiftConfigDto): Promise<ShiftConfig> {
    await this.getShift(id);

    if (!dto || Object.keys(dto).length === 0) throw new BadRequestException('No data provided to update');

    return this.prisma.shiftConfig.update({ where: { id }, data: dto });
  }

  getShifts(): Promise<ShiftConfig[]> {
    return this.prisma.shiftConfig.findMany();
  }

  async getShift(id: string): Promise<ShiftConfig> {
    const shift = await this.prisma.shiftConfig.findUnique({ where: { id } });
    if (!shift) throw new NotFoundException('Shift not found');

    return shift;
  }

  async removeShift(id: string): Promise<{ message: string }> {
    await this.getShift(id);

    const attendanceCount = await this.prisma.attendance.count({ where: { shiftId: id } });
    if (attendanceCount > 0) throw new ConflictException('Cannot delete shift with existing attendance records');

    await this.prisma.shiftConfig.delete({ where: { id } });
    return { message: 'Shift deleted successfully' };
  }
}

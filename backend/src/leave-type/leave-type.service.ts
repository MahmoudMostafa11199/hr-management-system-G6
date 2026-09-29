import { CreateLeaveTypeDto } from './dtos/create-leave-type.dto';
import { UpdateLeaveTypeDto } from './dtos/update-leave-type.dto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class LeaveTypeService {
  constructor(private readonly prisma: PrismaService) {}

  //
  async createLeaveType(dto: CreateLeaveTypeDto) {
    const existingLeaveType = await this.prisma.leaveType.findUnique({ where: { name: dto.name } });
    if (existingLeaveType) throw new ConflictException('LeaveType already exist');

    return await this.prisma.leaveType.create({ data: dto });
  }

  //
  async updateLeaveType(id: string, dto: UpdateLeaveTypeDto) {
    await this.getLeaveType(id);

    if (!dto || Object.keys(dto as object).length === 0) throw new BadRequestException('No data provided to update');

    return await this.prisma.leaveType.update({ where: { id }, data: dto });
  }

  //
  async getLeaveTypes() {
    const leaveTypes = await this.prisma.leaveType.findMany();

    return leaveTypes;
  }

  //
  async getLeaveType(id: string) {
    const leaveType = await this.prisma.leaveType.findUnique({ where: { id } });
    if (!leaveType) throw new NotFoundException('LeaveType not found');

    return leaveType;
  }

  //
  async removeLeaveType(id: string): Promise<{ message: string }> {
    await this.getLeaveType(id);

    const requestsCount = await this.prisma.permissionRequest.count({ where: { leaveTypeId: id } });
    if (requestsCount > 0) throw new ConflictException('Cannot delete leave type with existing permission requests');

    await this.prisma.leaveType.delete({ where: { id } });
    return { message: 'LeaveType deleted successfully' };
  }
}

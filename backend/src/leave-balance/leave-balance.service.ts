import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateLeaveBalanceDto } from './dtos/create-leave-balance.dto';
import { UpdateLeaveBalanceDto } from './dtos/update-leave-balance.dto';

@Injectable()
export class LeaveBalanceService {
  constructor(private readonly prisma: PrismaService) {}

  //
  async createBalance(dto: CreateLeaveBalanceDto) {
    const employee = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
    if (!employee) throw new NotFoundException('Employee not found');

    const leaveType = await this.prisma.leaveType.findUnique({ where: { id: dto.leaveTypeId } });
    if (!leaveType) throw new NotFoundException('Leave type not found');

    const existing = await this.prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: dto.employeeId,
          leaveTypeId: dto.leaveTypeId,
          year: dto.year,
        },
      },
    });
    if (existing) throw new ConflictException('Leave balance already exists for this employee, leave type, and year');

    return this.prisma.leaveBalance.create({ data: dto });
  }

  //
  async updateBalance(id: string, dto: UpdateLeaveBalanceDto) {
    await this.getBalance(id);

    if (!dto || Object.keys(dto).length === 0) throw new BadRequestException('No data provided to update');

    return this.prisma.leaveBalance.update({ where: { id }, data: dto });
  }

  //
  async getBalances(employeeId?: string) {
    return await this.prisma.leaveBalance.findMany({
      where: employeeId ? { employeeId } : undefined,
      include: {
        leaveType: { select: { name: true } },
        employee: { select: { firstName: true, lastName: true } },
      },
    });
  }

  //
  async getBalance(id: string) {
    const balance = await this.prisma.leaveBalance.findUnique({
      where: { id },
      include: { leaveType: true },
    });
    if (!balance) throw new NotFoundException('Leave balance not found');

    return balance;
  }

  //
  async getMyBalance(userId: string) {
    const employee = await this.prisma.employee.findUnique({ where: { userId } });
    if (!employee) throw new NotFoundException('Employee profile not found');

    return this.prisma.leaveBalance.findMany({
      where: { employeeId: employee.id },
      include: { leaveType: { select: { name: true } } },
    });
  }
}

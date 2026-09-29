import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { LeaveBalanceService } from './leave-balance.service';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/generated/prisma/enums';
import { CreateLeaveBalanceDto } from './dtos/create-leave-balance.dto';
import { UpdateLeaveBalanceDto } from './dtos/update-leave-balance.dto';
import { CurrentUser } from 'src/user/decorators/current-user.decorator';
import type { JwtPayloadType } from 'src/utils/types';
import { ApiCookieAuth, ApiForbiddenResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

@ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
@ApiForbiddenResponse({ description: 'Insufficient role permissions' })
@ApiTags('Leave Balance')
@ApiCookieAuth('token')
@Controller('leave-balances')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeaveBalanceController {
  constructor(private readonly leaveBalanceService: LeaveBalanceService) {}

  @Post()
  @Roles(Role.ADMIN, Role.HR)
  create(@Body() dto: CreateLeaveBalanceDto) {
    return this.leaveBalanceService.createBalance(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.HR)
  update(@Body() dto: UpdateLeaveBalanceDto, @Param('id') id: string) {
    return this.leaveBalanceService.updateBalance(id, dto);
  }

  @Get('my')
  @Roles(Role.EMPLOYEE)
  getMyBalance(@CurrentUser() user: JwtPayloadType) {
    return this.leaveBalanceService.getMyBalance(user.sub);
  }

  @Get()
  @Roles(Role.ADMIN, Role.HR)
  findAll(@Query('employeeId') employeeId?: string) {
    return this.leaveBalanceService.getBalances(employeeId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.HR)
  findOne(@Param('id') id: string) {
    return this.leaveBalanceService.getBalance(id);
  }
}

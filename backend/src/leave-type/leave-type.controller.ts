import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Role } from 'src/generated/prisma/enums';
import { CreateLeaveTypeDto } from './dtos/create-leave-type.dto';
import { UpdateLeaveTypeDto } from './dtos/update-leave-type.dto';
import { LeaveTypeService } from './leave-type.service';
import { ApiCookieAuth, ApiForbiddenResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

@ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
@ApiForbiddenResponse({ description: 'Insufficient role permissions' })
@ApiTags('Leave Type')
@ApiCookieAuth('token')
@Controller('leave-types')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeaveTypeController {
  constructor(private readonly leaveTypeService: LeaveTypeService) {}

  @Post()
  @Roles(Role.ADMIN, Role.HR)
  create(@Body() dto: CreateLeaveTypeDto) {
    return this.leaveTypeService.createLeaveType(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.HR)
  update(@Body() dto: UpdateLeaveTypeDto, @Param('id') id: string) {
    return this.leaveTypeService.updateLeaveType(id, dto);
  }

  @Get()
  findAll() {
    return this.leaveTypeService.getLeaveTypes();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.leaveTypeService.getLeaveType(id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.HR)
  remove(@Param('id') id: string) {
    return this.leaveTypeService.removeLeaveType(id);
  }
}

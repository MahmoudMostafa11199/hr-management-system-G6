import { Body, Controller, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';
import { Role } from 'src/generated/prisma/enums';
import { CurrentUser } from 'src/user/decorators/current-user.decorator';
import type { JwtPayloadType } from 'src/utils/types';
import { AttendanceService } from './attendance.service';
import { GetAttendancesQueryDto } from './dtos/attendance-query.dto';
import { CreateAttendanceDto } from './dtos/create-attendance.dto';
import { UpdateAttendanceDto } from './dtos/update-attendance.dto';
import { GetAttendanceReportQueryDto } from './dtos/attendance-report-query.dto';
import { GetAttendanceDepartmentLevelQueryDto } from './dtos/attendance-department-level-query.dto';
import type { Response } from 'express';
import { ApiCookieAuth, ApiForbiddenResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

@ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
@ApiForbiddenResponse({ description: 'Insufficient role permissions' })
@ApiTags('Attendance')
@ApiCookieAuth('token')
@Controller('attendances')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post()
  @Roles(Role.ADMIN, Role.HR, Role.SECURITY)
  create(@Body() dto: CreateAttendanceDto, @CurrentUser() user: JwtPayloadType) {
    return this.attendanceService.createAttendance(dto, user.sub);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.HR, Role.SECURITY)
  update(@Body() dto: UpdateAttendanceDto, @Param('id') id: string) {
    return this.attendanceService.updateAttendance(id, dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.HR, Role.MANAGER)
  findAll(@Query() query: GetAttendancesQueryDto) {
    return this.attendanceService.getAttendances(query);
  }
  @Get('me')
  @Roles(Role.EMPLOYEE)
  getMyAttendances(@CurrentUser() user: JwtPayloadType, @Query() query: PaginationQueryDto) {
    return this.attendanceService.getMyAttendance(user.sub, query);
  }

  @Get('report')
  @Roles(Role.ADMIN, Role.HR)
  getMonthlyReport(@Query() query: GetAttendanceReportQueryDto) {
    return this.attendanceService.getMonthlyReport(query);
  }

  @Get('report/department')
  @Roles(Role.ADMIN, Role.HR)
  getDepartmentLevel(@Query() query: GetAttendanceDepartmentLevelQueryDto) {
    return this.attendanceService.getDepartmentLevel(query);
  }

  @Get('report/export/excel')
  @Roles(Role.ADMIN, Role.HR)
  exportExcel(@Query() query: GetAttendanceReportQueryDto, @Res() res: Response) {
    return this.attendanceService.getExportMonthlyReportExcel(query, res);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.HR, Role.MANAGER)
  findOne(@Param('id') id: string) {
    return this.attendanceService.getAttendance(id);
  }
}

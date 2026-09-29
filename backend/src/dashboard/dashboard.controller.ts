import { DashboardService } from './dashboard.service';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiForbiddenResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Role } from 'src/generated/prisma/enums';
import { CurrentUser } from 'src/user/decorators/current-user.decorator';
import type { JwtPayloadType } from 'src/utils/types';

@ApiTags('Dashboard')
@ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
@ApiForbiddenResponse({ description: 'Insufficient role permissions' })
@ApiCookieAuth('token')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  //
  @Get('admin')
  @Roles(Role.ADMIN)
  getAdminDashboard() {
    return this.dashboardService.getAdminDashboard();
  }

  //
  @Get('hr')
  @Roles(Role.HR)
  getHrDashboard() {
    return this.dashboardService.getHrDashboard();
  }

  //
  @Get('manager')
  @Roles(Role.MANAGER)
  getManagerDashboard(@CurrentUser() user: JwtPayloadType) {
    return this.dashboardService.getManagerDashboard(user.sub);
  }

  //
  @Get('employee')
  @Roles(Role.EMPLOYEE)
  getEmployeeDashboard(@CurrentUser() user: JwtPayloadType) {
    return this.dashboardService.getEmployeeDashboard(user.sub);
  }
}

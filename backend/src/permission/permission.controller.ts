import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Role } from 'src/generated/prisma/enums';
import { CurrentUser } from 'src/user/decorators/current-user.decorator';
import type { JwtPayloadType } from 'src/utils/types';
import { CreatePermissionDto } from './dtos/create-permission.dto';
import { HrActionDto } from './dtos/hr-action.dto';
import { ManagerActionDto } from './dtos/manager-action.dto';
import { GetPermissionQueryDto } from './dtos/permission-query.dto';
import { PermissionService } from './permission.service';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';
import { ApiCookieAuth, ApiForbiddenResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

@ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
@ApiForbiddenResponse({ description: 'Insufficient role permissions' })
@ApiTags('Permission Request')
@ApiCookieAuth('token')
@Controller('permission-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Post()
  @Roles(Role.EMPLOYEE)
  create(@CurrentUser() user: JwtPayloadType, @Body() dto: CreatePermissionDto) {
    return this.permissionService.createPermissionRequest(user.sub, dto);
  }

  @Patch(':id/manager-action')
  @Roles(Role.MANAGER)
  updateManagerAction(@Param('id') id: string, @CurrentUser() user: JwtPayloadType, @Body() dto: ManagerActionDto) {
    return this.permissionService.managerAction(id, user, dto);
  }

  @Patch(':id/hr-action')
  @Roles(Role.HR)
  updateHrAction(@Param('id') id: string, @CurrentUser() user: JwtPayloadType, @Body() dto: HrActionDto) {
    return this.permissionService.hrAction(id, user, dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.HR, Role.MANAGER)
  findAll(@Query() query: GetPermissionQueryDto, @CurrentUser() user: JwtPayloadType) {
    return this.permissionService.getPermissionRequests(query, user);
  }

  @Get('my')
  @Roles(Role.EMPLOYEE)
  getMyPermission(@CurrentUser() user: JwtPayloadType, @Query() query: PaginationQueryDto) {
    return this.permissionService.getMyPermission(user, query);
  }

  @Delete(':id')
  @Roles(Role.EMPLOYEE)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayloadType) {
    return this.permissionService.removePermissionRequest(id, user);
  }
}

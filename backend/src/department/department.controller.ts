import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { DepartmentService } from './department.service';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/generated/prisma/enums';
import { CreateDepartmentDto } from './dtos/create-department.dto';
import { UpdateDepartmentDto } from './dtos/update-department.dto';
import { GetDepartmentsQueryDto } from './dtos/department-query.dto';
import { ApiCookieAuth, ApiForbiddenResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

@ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
@ApiForbiddenResponse({ description: 'Insufficient role permissions' })
@ApiTags('Department')
@ApiCookieAuth('token')
@Controller('departments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DepartmentController {
  constructor(private readonly departmentSrevice: DepartmentService) {}

  @Post()
  @Roles(Role.ADMIN, Role.HR)
  create(@Body() dto: CreateDepartmentDto) {
    return this.departmentSrevice.createDepartment(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.HR)
  update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return this.departmentSrevice.updateDepartment(id, dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.HR, Role.MANAGER)
  findAll(@Query() query: GetDepartmentsQueryDto) {
    return this.departmentSrevice.getDepartments(query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.HR, Role.MANAGER)
  findOne(@Param('id') id: string) {
    return this.departmentSrevice.getDepartment(id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.HR)
  remove(@Param('id') id: string) {
    return this.departmentSrevice.removeDepartment(id);
  }
}

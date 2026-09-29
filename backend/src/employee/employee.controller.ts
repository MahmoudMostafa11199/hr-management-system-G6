import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { CreateEmployeeDto } from 'src/employee/dtos/create-employee.dto';
import { EmployeeService } from './employee.service';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/generated/prisma/enums';
import { UpdateEmployeeDto } from 'src/employee/dtos/update-employee.dto';
import { CurrentUser } from 'src/user/decorators/current-user.decorator';
import type { JwtPayloadType } from 'src/utils/types';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadsService } from 'src/uploads/uploads.service';
import { multerOptions } from 'src/uploads/multer.config';
import { GetEmployeesQueryDto } from './dtos/employees-query.dto';
import { ApiCookieAuth, ApiForbiddenResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

@ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
@ApiForbiddenResponse({ description: 'Insufficient role permissions' })
@ApiTags('Employee')
@ApiCookieAuth('token')
@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmployeeController {
  constructor(
    private readonly employeeService: EmployeeService,
    private readonly uploadService: UploadsService,
  ) {}

  @Post()
  @Roles(Role.ADMIN, Role.HR)
  @UseInterceptors(FileInterceptor('photo'))
  async create(@Body() dto: CreateEmployeeDto) {
    return await this.employeeService.createEmployee(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.HR)
  async findAll(@Query() query: GetEmployeesQueryDto) {
    return await this.employeeService.getEmployees(query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.HR, Role.MANAGER)
  async findOne(@Param('id') id: string, @CurrentUser() payload: JwtPayloadType) {
    return await this.employeeService.getEmployee(id, payload);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.HR)
  async update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return await this.employeeService.updateEmployee(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  async remove(@Param('id') id: string) {
    return await this.employeeService.removeEmployee(id);
  }

  // Upload photo to employee
  @Post(':id/photo')
  @Roles(Role.ADMIN, Role.HR, Role.EMPLOYEE)
  @UseInterceptors(FileInterceptor('photo', multerOptions('employees')))
  async uploadPhoto(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayloadType,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');

    const url = this.uploadService.getFileUrl(file);
    return await this.employeeService.updateEmployeePhoto(id, url, user);
  }
}

/*
{
  "firstName": "Ahmed",
  "lastName": "Mostafa",
  "nationalId": "29911011234567",
  "phone": "01012345678",
  "jobTitle": "Backlinks",
  "hireDate": "2026-01-15",
  "contractType": "FULL_TIME",
  "baseSalary": 8000,
  "bankAccount": "1234567890",
  "emergencyContact": "01098765432",
  "email": "ahmed.mostafa@hr.com",
  "password": "Ahmed@123",
  "role": "EMPLOYEE"
}
{
  "firstName": "Akram",
  "lastName": "Gaber",
  "nationalId": "29901234567890",
  "phone": "01012345678",
  "jobTitle": "Engineering Manager",
  "hireDate": "2024-01-15",
  "contractType": "FULL_TIME",
  "baseSalary": 25000,
  "bankAccount": "1234567890",
  "emergencyContact": "01098765432",
  "departmentId": "c88c620b-b5d9-4f76-9a27-31f302386606",
  "email": "akram.manager@hr.com",
  "password": "Password123!",
  "role": "MANAGER"
}
 {
  "firstName": "Omar",
  "lastName": "Nabil",
  "nationalId": "29912098765432",
  "phone": "01099887766",
  "jobTitle": "Sales Representative",
  "hireDate": "2025-05-10",
  "contractType": "FULL_TIME",
  "baseSalary": 9000,
  "bankAccount": "5544332211",
  "emergencyContact": "01055443322",
  "departmentId": "ضع id قسم Sales هنا",
  "email": "omar.nabil@hr.com",
  "password": "Password123!",
  "role": "EMPLOYEE"
} 
  {
  "firstName": "Yasmin",
  "lastName": "Fathy",
  "nationalId": "29805123456789",
  "phone": "01234567890",
  "jobTitle": "Sales Manager",
  "hireDate": "2024-03-01",
  "contractType": "FULL_TIME",
  "baseSalary": 22000,
  "bankAccount": "1122334455",
  "emergencyContact": "01198765432",
  "departmentId": "1e0c217b-1223-4fcd-87fc-f9379de3be52",
  "email": "yasmin.manager@manager.com",
  "password": "Password123!",
  "role": "MANAGER"
}
*/

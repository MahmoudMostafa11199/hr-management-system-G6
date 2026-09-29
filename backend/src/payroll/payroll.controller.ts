import { Body, Controller, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { CreatePayrollConfigDto } from './dtos/create.payroll.config.dto';
import { PayrollService } from './payroll.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/generated/prisma/enums';
import { CurrentUser } from 'src/user/decorators/current-user.decorator';
import type { JwtPayloadType } from 'src/utils/types';
import { CalculatePayrollQueryDto } from './dtos/calculate-payroll-query.dto';
import { PayslipQueryDto } from './dtos/payslip-query.dto';
import { MyPayslipQueryDto } from './dtos/my-payslip-query.dto';
import type { Response } from 'express';
import { ApiCookieAuth, ApiForbiddenResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

@ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
@ApiForbiddenResponse({ description: 'Insufficient role permissions' })
@ApiTags('Payroll')
@ApiCookieAuth('token')
@Controller('payroll')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  //
  @Post('calculate')
  @Roles(Role.ADMIN, Role.HR)
  calculate(@Query() query: CalculatePayrollQueryDto) {
    return this.payrollService.calculatePayroll(query);
  }

  //
  @Get()
  @Roles(Role.ADMIN, Role.HR)
  findAll(@Query() query: PayslipQueryDto) {
    return this.payrollService.getAllPayslips(query);
  }

  //
  @Get('my')
  @Roles(Role.EMPLOYEE)
  getMyPayslips(@CurrentUser() user: JwtPayloadType, @Query() query: MyPayslipQueryDto) {
    return this.payrollService.getMyPayslips(user, query);
  }

  //
  @Patch(':id/finalise')
  @Roles(Role.ADMIN, Role.HR)
  changeStatus(@Param('id') id: string, @CurrentUser() user: JwtPayloadType) {
    return this.payrollService.changeStatus(id, user);
  }

  //
  @Get(':id/pdf')
  @Roles(Role.ADMIN, Role.HR, Role.EMPLOYEE)
  async downloadPdf(@Param('id') id: string, @CurrentUser() user: JwtPayloadType, @Res() res: Response) {
    const { buffer: pdfBuffer, filename } = await this.payrollService.downloadAsPdf(id, user);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=${filename}.pdf`,
    });
    res.send(pdfBuffer);
  }

  //---------------------------
  // Config
  @Get('config')
  @Roles(Role.ADMIN)
  getConfigs() {
    return this.payrollService.getConfigs();
  }

  @Post('config')
  @Roles(Role.ADMIN)
  createSalaryConfig(@Body() dto: CreatePayrollConfigDto) {
    return this.payrollService.createConfig(dto);
  }
}

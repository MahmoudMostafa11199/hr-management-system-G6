import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/generated/prisma/enums';
import { CreateShiftConfigDto } from './dtos/create-shift-config.dto';
import { UpdateShiftConfigDto } from './dtos/update-shift-config.dto';
import { ShiftConfigService } from './shift-config.service';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { ApiCookieAuth, ApiForbiddenResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

@ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
@ApiForbiddenResponse({ description: 'Insufficient role permissions' })
@ApiTags('Shift Config')
@ApiCookieAuth('token')
@Controller('shift-config')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShiftConfigController {
  constructor(private readonly shiftConfigService: ShiftConfigService) {}

  @Post()
  @Roles(Role.ADMIN, Role.HR)
  create(@Body() dto: CreateShiftConfigDto) {
    return this.shiftConfigService.createShift(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.HR)
  update(@Body() dto: UpdateShiftConfigDto, @Param('id') id: string) {
    return this.shiftConfigService.updateShift(id, dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.HR, Role.SECURITY)
  findAll() {
    return this.shiftConfigService.getShifts();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.HR, Role.SECURITY)
  findOne(@Param('id') id: string) {
    return this.shiftConfigService.getShift(id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.HR)
  remove(@Param('id') id: string) {
    return this.shiftConfigService.removeShift(id);
  }
}

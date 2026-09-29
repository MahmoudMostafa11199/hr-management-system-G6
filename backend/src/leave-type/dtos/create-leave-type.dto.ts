import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsInt, IsBoolean, IsOptional } from 'class-validator';

export class CreateLeaveTypeDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  name!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @ApiPropertyOptional()
  maxDurationDays?: number;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ default: true })
  requiresHrApproval?: boolean = true;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreatePermissionDto {
  @IsDateString()
  @IsNotEmpty()
  @ApiProperty({ example: '2026-10-01', description: 'Leave start date' })
  startDate!: string;

  @IsDateString()
  @IsNotEmpty()
  @ApiProperty({ example: '2026-10-03', description: 'Leave end date' })
  endDate!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Family emergency', description: 'Reason for the leave request' })
  reason!: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Optional file URL/key for supporting document' })
  attachment?: string;

  @IsUUID()
  @ApiProperty({ example: 'a1b2c3d4-...', description: 'ID of the LeaveType being requested' })
  leaveTypeId!: string;
}

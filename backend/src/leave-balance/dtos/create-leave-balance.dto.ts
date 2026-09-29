import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsUUID, Min } from 'class-validator';

export class CreateLeaveBalanceDto {
  @Type(() => Number)
  @IsNotEmpty()
  @IsInt()
  @Min(2020)
  @ApiProperty()
  year!: number;

  @Type(() => Number)
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  @ApiProperty()
  balance!: number;

  @IsUUID()
  @IsNotEmpty()
  @ApiProperty()
  employeeId!: string;

  @IsUUID()
  @IsNotEmpty()
  @ApiProperty()
  leaveTypeId!: string;
}

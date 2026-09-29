import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsUUID, Max, Min } from 'class-validator';

export class GetAttendanceReportQueryDto {
  @IsUUID()
  @IsNotEmpty()
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  employeeId!: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  @ApiProperty({ example: 9, minimum: 1, maximum: 12 })
  month!: number;

  @IsInt()
  @Type(() => Number)
  @IsNotEmpty()
  @Min(2015)
  @Max(new Date().getFullYear())
  @ApiProperty({ example: 2026, minimum: 2015 })
  year!: number;
}

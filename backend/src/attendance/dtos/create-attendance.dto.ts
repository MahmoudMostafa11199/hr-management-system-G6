import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AttendanceStatus } from 'src/generated/prisma/enums';

export class CreateAttendanceDto {
  @IsDateString()
  @IsNotEmpty()
  @ApiProperty()
  date!: string;

  @IsDateString()
  @IsOptional()
  @ApiProperty({ required: false })
  checkIn?: string;

  @IsDateString()
  @IsOptional()
  @ApiProperty({ required: false })
  checkOut?: string;

  @IsEnum(AttendanceStatus)
  @IsOptional()
  @ApiProperty({ enum: AttendanceStatus, required: false })
  status?: AttendanceStatus;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  note?: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  employeeId!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  shiftId!: string;
}

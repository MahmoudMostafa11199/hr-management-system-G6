import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Matches, Min } from 'class-validator';

export class CreateShiftConfigDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'startTime must be in HH:mm format' })
  @ApiProperty({ example: '09:00' })
  startTime!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'endTime must be in HH:mm format' })
  @ApiProperty({ example: '18:00' })
  endTime!: string;

  @IsNumber()
  @Min(0)
  @ApiProperty()
  lateToleranceMinutes!: number;

  @IsNumber()
  @Min(0)
  @ApiProperty()
  deductionRule!: number;
}

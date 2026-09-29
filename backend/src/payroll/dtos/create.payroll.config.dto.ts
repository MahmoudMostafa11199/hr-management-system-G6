import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsNumber, Max, Min } from 'class-validator';

export class CreatePayrollConfigDto {
  @IsNumber()
  @ApiProperty()
  transportAllowance!: number;

  @IsNumber()
  @ApiProperty()
  housingAllowance!: number;

  @IsNumber()
  @ApiProperty()
  medicalAllowance!: number;

  @IsNumber()
  @ApiProperty()
  lateDeductionAmount!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @ApiProperty()
  overdueTaskDeductionPercent!: number;

  @IsDate()
  @Type(() => Date)
  @ApiProperty()
  effectiveFrom!: Date;
}

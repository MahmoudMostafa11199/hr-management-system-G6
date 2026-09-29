import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class CalculatePayrollQueryDto {
  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  month!: number;

  @IsInt()
  @Min(2000)
  @Type(() => Number)
  year!: number;

  @IsOptional()
  @IsUUID()
  employeeId?: string;
}

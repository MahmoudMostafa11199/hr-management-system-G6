import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min, ValidateIf } from 'class-validator';

export class ReportQueryDto {
  @ValidateIf((o) => o.year !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  @ApiPropertyOptional()
  month?: number;

  @ValidateIf((o) => o.month !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(new Date().getFullYear())
  @ApiPropertyOptional()
  year?: number;
}

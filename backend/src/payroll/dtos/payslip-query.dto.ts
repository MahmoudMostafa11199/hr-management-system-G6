import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';
import { PayslipStatus } from 'src/generated/prisma/enums';

export class PayslipQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  month?: number;

  @IsOptional()
  @IsInt()
  @Min(2000)
  @Type(() => Number)
  year?: number;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsEnum(PayslipStatus)
  status?: PayslipStatus;
}

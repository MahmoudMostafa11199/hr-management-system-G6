import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';
import { PermissionStatus } from 'src/generated/prisma/enums';

export class GetPermissionQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(PermissionStatus)
  @ApiPropertyOptional({ enum: PermissionStatus })
  status?: PermissionStatus;

  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional()
  leaveTypeId?: string;
}

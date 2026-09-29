import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';
import { TaskStatus } from 'src/generated/prisma/enums';

export class TaskQueryDto extends PaginationQueryDto {
  @IsUUID()
  @IsOptional()
  @ApiPropertyOptional()
  employeeId?: string;

  @IsEnum(TaskStatus)
  @IsOptional()
  @ApiPropertyOptional({ enum: TaskStatus })
  status?: TaskStatus;
}

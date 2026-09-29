import { IsOptional } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';

export class GetDepartmentsQueryDto extends PaginationQueryDto {
  @IsOptional()
  name?: string;
}

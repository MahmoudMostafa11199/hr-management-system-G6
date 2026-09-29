import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  name!: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  managerId?: string;
}

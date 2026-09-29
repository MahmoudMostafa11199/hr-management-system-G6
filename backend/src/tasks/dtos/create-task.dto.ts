import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { TaskPriority } from 'src/generated/prisma/enums';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  title!: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  description?: string;

  @IsDateString()
  @IsNotEmpty()
  @ApiProperty()
  deadline!: string;

  @IsEnum(TaskPriority)
  @IsNotEmpty()
  @ApiProperty({ enum: TaskPriority })
  priority!: TaskPriority;

  @IsUUID()
  @IsNotEmpty()
  @ApiProperty()
  assignedToId!: string;
}

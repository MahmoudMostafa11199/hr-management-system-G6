import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { TaskStatus } from 'src/generated/prisma/enums';

export class UpdateTaskStatusDto {
  @IsEnum(TaskStatus)
  @IsNotEmpty()
  @ApiProperty({ enum: TaskStatus })
  status!: TaskStatus;
}

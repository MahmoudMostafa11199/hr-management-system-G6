import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ManagerDecision } from './manager-action.dto';
import { ApiProperty } from '@nestjs/swagger';

export class HrActionDto {
  @IsEnum(ManagerDecision)
  @IsNotEmpty()
  @ApiProperty({ enum: ManagerDecision })
  decision!: ManagerDecision;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  comment!: string;
}

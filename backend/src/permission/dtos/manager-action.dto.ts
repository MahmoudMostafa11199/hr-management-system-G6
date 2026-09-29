import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export enum ManagerDecision {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class ManagerActionDto {
  @IsEnum(ManagerDecision)
  @IsNotEmpty()
  @ApiProperty({ enum: ManagerDecision })
  decision!: ManagerDecision;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  comment!: string;
}

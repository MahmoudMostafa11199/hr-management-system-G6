import { OmitType } from '@nestjs/swagger';
import { TaskQueryDto } from './task-query.dto';

export class MyTaskQueryDto extends OmitType(TaskQueryDto, ['employeeId'] as const) {}

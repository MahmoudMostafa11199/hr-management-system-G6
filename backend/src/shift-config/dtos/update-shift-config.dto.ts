import { PartialType } from '@nestjs/swagger';
import { CreateShiftConfigDto } from './create-shift-config.dto';

export class UpdateShiftConfigDto extends PartialType(CreateShiftConfigDto) {}

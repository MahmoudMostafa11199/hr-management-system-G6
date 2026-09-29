import { OmitType } from '@nestjs/swagger';
import { PayslipQueryDto } from './payslip-query.dto';

export class MyPayslipQueryDto extends OmitType(PayslipQueryDto, ['departmentId', 'status'] as const) {}

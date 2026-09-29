import { Test, TestingModule } from '@nestjs/testing';
import { ShiftConfigService } from './shift-config.service';

describe('ShiftConfigService', () => {
  let service: ShiftConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ShiftConfigService],
    }).compile();

    service = module.get<ShiftConfigService>(ShiftConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

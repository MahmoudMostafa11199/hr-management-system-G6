import { Test, TestingModule } from '@nestjs/testing';
import { ShiftConfigController } from './shift-config.controller';

describe('ShiftConfigController', () => {
  let controller: ShiftConfigController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShiftConfigController],
    }).compile();

    controller = module.get<ShiftConfigController>(ShiftConfigController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

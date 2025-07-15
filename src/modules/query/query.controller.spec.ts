import { Test, TestingModule } from '@nestjs/testing';
import { QueryController } from './query.controller';
import { QueryService } from './query.service';

describe('QueryController', () => {
  let controller: QueryController;
  let service: QueryService;

  const mockQueryService = {
    query: jest.fn().mockResolvedValue('mocked response'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QueryController],
      providers: [{ provide: QueryService, useValue: mockQueryService }],
    }).compile();

    controller = module.get<QueryController>(QueryController);
    service = module.get<QueryService>(QueryService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call QueryService.query and return the result', async () => {
    const dto = { message: 'How many employees does Cloudinary have?' };
    const result = await controller.query(dto);
    expect(service.query).toHaveBeenCalledWith(
      'How many employees does Cloudinary have?',
    );
    expect(result).toBe('mocked response');
  });
});

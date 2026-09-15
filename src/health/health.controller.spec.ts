import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  let prisma: { $queryRaw: jest.Mock };

  beforeEach(async () => {
    prisma = { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) };

    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();

    controller = module.get(HealthController);
  });

  it('devuelve status ok cuando la base de datos responde', async () => {
    const result = await controller.check();

    expect(prisma.$queryRaw).toHaveBeenCalled();
    expect(result.status).toBe('ok');
    expect(result.timestamp).toEqual(expect.any(String));
  });

  it('propaga el error si la base de datos no responde', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('connection refused'));

    await expect(controller.check()).rejects.toThrow('connection refused');
  });
});

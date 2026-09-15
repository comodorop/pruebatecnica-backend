import { Test } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let service: { create: jest.Mock; findAll: jest.Mock; findById: jest.Mock; update: jest.Mock };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: service }],
    }).compile();

    controller = module.get(UsersController);
  });

  it('create() delega en UsersService.create', async () => {
    const dto = { email: 'a@a.com', name: 'A', password: 'Password123!' };
    service.create.mockResolvedValue({ id: '1', ...dto });

    const result = await controller.create(dto);

    expect(service.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: '1', ...dto });
  });

  it('findAll() delega en UsersService.findAll', async () => {
    service.findAll.mockResolvedValue([{ id: '1' }]);

    const result = await controller.findAll();

    expect(service.findAll).toHaveBeenCalled();
    expect(result).toEqual([{ id: '1' }]);
  });

  it('findOne() delega en UsersService.findById con el id de la ruta', async () => {
    service.findById.mockResolvedValue({ id: '1' });

    const result = await controller.findOne('1');

    expect(service.findById).toHaveBeenCalledWith('1');
    expect(result).toEqual({ id: '1' });
  });

  it('update() delega en UsersService.update con id y dto', async () => {
    const dto = { name: 'Nuevo' };
    service.update.mockResolvedValue({ id: '1', name: 'Nuevo' });

    const result = await controller.update('1', dto);

    expect(service.update).toHaveBeenCalledWith('1', dto);
    expect(result).toEqual({ id: '1', name: 'Nuevo' });
  });
});

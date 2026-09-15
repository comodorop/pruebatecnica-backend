import { Test } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: { login: jest.Mock };
  let usersService: { findById: jest.Mock };

  beforeEach(async () => {
    authService = { login: jest.fn() };
    usersService = { findById: jest.fn() };

    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    controller = module.get(AuthController);
  });

  it('login() delega en AuthService.login con email y password del DTO', async () => {
    authService.login.mockResolvedValue({ accessToken: 'token', user: { id: '1' } });

    const result = await controller.login({ email: 'a@a.com', password: 'Password123!' });

    expect(authService.login).toHaveBeenCalledWith('a@a.com', 'Password123!');
    expect(result).toEqual({ accessToken: 'token', user: { id: '1' } });
  });

  it('me() devuelve el usuario del token vía UsersService.findById', async () => {
    usersService.findById.mockResolvedValue({ id: 'user-1', email: 'a@a.com' });

    const result = await controller.me({ userId: 'user-1', email: 'a@a.com' });

    expect(usersService.findById).toHaveBeenCalledWith('user-1');
    expect(result).toEqual({ id: 'user-1', email: 'a@a.com' });
  });
});

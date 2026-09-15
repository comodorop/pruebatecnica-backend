import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: { findByEmail: jest.Mock; findById: jest.Mock };
  let jwtService: { signAsync: jest.Mock };

  const rawUser = {
    id: 'user-1',
    email: 'admin@deborix.test',
    name: 'Admin',
    password: '',
    avatarUrl: null,
  };

  beforeAll(async () => {
    rawUser.password = await bcrypt.hash('Admin123!', 10);
  });

  beforeEach(async () => {
    usersService = { findByEmail: jest.fn(), findById: jest.fn() };
    jwtService = { signAsync: jest.fn().mockResolvedValue('signed.jwt.token') };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('validateCredentials', () => {
    it('devuelve el usuario cuando el password es correcto', async () => {
      usersService.findByEmail.mockResolvedValue(rawUser);

      const result = await service.validateCredentials(rawUser.email, 'Admin123!');

      expect(result).toBe(rawUser);
    });

    it('lanza UnauthorizedException si el usuario no existe', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(service.validateCredentials('nadie@a.com', 'x')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('lanza UnauthorizedException si el password no coincide', async () => {
      usersService.findByEmail.mockResolvedValue(rawUser);

      await expect(service.validateCredentials(rawUser.email, 'password-incorrecto')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('login', () => {
    it('devuelve accessToken y el usuario sanitizado (vía findById)', async () => {
      usersService.findByEmail.mockResolvedValue(rawUser);
      usersService.findById.mockResolvedValue({
        id: rawUser.id,
        email: rawUser.email,
        name: rawUser.name,
        avatarUrl: null,
      });

      const result = await service.login(rawUser.email, 'Admin123!');

      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.user).not.toHaveProperty('password');
      expect(jwtService.signAsync).toHaveBeenCalledWith({ sub: rawUser.id, email: rawUser.email });
      expect(usersService.findById).toHaveBeenCalledWith(rawUser.id);
    });

    it('no llama a findById si las credenciales son inválidas', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(service.login('nadie@a.com', 'x')).rejects.toThrow(UnauthorizedException);
      expect(usersService.findById).not.toHaveBeenCalled();
    });
  });
});

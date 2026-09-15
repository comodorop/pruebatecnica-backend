import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };
  let s3: { getPresignedUrl: jest.Mock };

  const baseUser = {
    id: 'user-1',
    email: 'user@example.com',
    name: 'User One',
    password: 'hashed-password',
    avatarUrl: null as string | null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };
    s3 = { getPresignedUrl: jest.fn().mockResolvedValue('https://signed.example.com/avatar.png') };

    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: S3Service, useValue: s3 },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  describe('create', () => {
    it('crea el usuario y no expone el password', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ ...baseUser });

      const result = await service.create({
        email: baseUser.email,
        name: baseUser.name,
        password: 'Password123!',
      });

      expect(result).not.toHaveProperty('password');
      expect((result as any).email).toBe(baseUser.email);
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: baseUser.email, name: baseUser.name }),
        }),
      );
      // el password guardado debe ser un hash, no el texto plano
      const savedPassword = prisma.user.create.mock.calls[0][0].data.password;
      expect(savedPassword).not.toBe('Password123!');
    });

    it('lanza ConflictException si el email ya existe', async () => {
      prisma.user.findUnique.mockResolvedValue(baseUser);

      await expect(
        service.create({ email: baseUser.email, name: baseUser.name, password: 'Password123!' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('devuelve todos los usuarios sanitizados con avatar firmado', async () => {
      prisma.user.findMany.mockResolvedValue([{ ...baseUser, avatarUrl: 'uploads/user-1/pic.png' }]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty('password');
      expect(result[0].avatarUrl).toBe('https://signed.example.com/avatar.png');
      expect(s3.getPresignedUrl).toHaveBeenCalledWith('uploads/user-1/pic.png');
    });

    it('devuelve avatarUrl null cuando el usuario no tiene foto', async () => {
      prisma.user.findMany.mockResolvedValue([{ ...baseUser }]);

      const result = await service.findAll();

      expect(result[0].avatarUrl).toBeNull();
      expect(s3.getPresignedUrl).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('devuelve el usuario cuando existe', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...baseUser });

      const result = await service.findById(baseUser.id);

      expect((result as any).id).toBe(baseUser.id);
    });

    it('lanza NotFoundException cuando no existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('devuelve el usuario crudo (con password) para validar credenciales', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...baseUser });

      const result = await service.findByEmail(baseUser.email);

      expect(result).toHaveProperty('password');
    });
  });

  describe('update', () => {
    it('lanza NotFoundException si el usuario no existe', async () => {
      prisma.user.findUniqueOrThrow.mockRejectedValue(new Error('not found in db'));

      await expect(service.update('missing', { name: 'Nuevo' })).rejects.toThrow(NotFoundException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('lanza ConflictException si el nuevo email pertenece a otro usuario', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({ ...baseUser });
      prisma.user.findUnique.mockResolvedValue({ ...baseUser, id: 'other-user' });

      await expect(service.update(baseUser.id, { email: 'taken@example.com' })).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('actualiza solo los campos provistos', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({ ...baseUser });
      prisma.user.update.mockResolvedValue({ ...baseUser, name: 'Nuevo Nombre' });

      const result = await service.update(baseUser.id, { name: 'Nuevo Nombre' });

      expect(prisma.user.findUnique).not.toHaveBeenCalled(); // no cambia email, no valida duplicado
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: baseUser.id },
        data: { name: 'Nuevo Nombre' },
      });
      expect((result as any).name).toBe('Nuevo Nombre');
    });
  });

  describe('setAvatarKey', () => {
    it('guarda la key de S3 y devuelve la URL firmada', async () => {
      prisma.user.update.mockResolvedValue({ ...baseUser, avatarUrl: 'uploads/user-1/new.png' });

      const result = await service.setAvatarKey(baseUser.id, 'uploads/user-1/new.png');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: baseUser.id },
        data: { avatarUrl: 'uploads/user-1/new.png' },
      });
      expect(result.avatarUrl).toBe('https://signed.example.com/avatar.png');
    });
  });
});

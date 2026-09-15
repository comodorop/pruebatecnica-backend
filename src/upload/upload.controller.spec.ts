import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { S3Service } from '../s3/s3.service';
import { UsersService } from '../users/users.service';

describe('UploadController', () => {
  let controller: UploadController;
  let s3: { uploadFile: jest.Mock };
  let usersService: { findById: jest.Mock; setAvatarKey: jest.Mock };

  const currentUser = { userId: 'user-1', email: 'a@a.com' };
  const makeFile = (mimetype: string) =>
    ({ mimetype, originalname: 'pic.png', buffer: Buffer.from('x') }) as Express.Multer.File;

  beforeEach(async () => {
    s3 = { uploadFile: jest.fn().mockResolvedValue({ key: 'uploads/user-1/pic.png', url: 'https://signed.example/pic.png' }) };
    usersService = { findById: jest.fn(), setAvatarKey: jest.fn().mockResolvedValue({}) };

    const module = await Test.createTestingModule({
      controllers: [UploadController],
      providers: [
        { provide: S3Service, useValue: s3 },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    controller = module.get(UploadController);
  });

  it('rechaza tipos de archivo no permitidos', async () => {
    await expect(controller.upload(makeFile('application/pdf'), currentUser)).rejects.toThrow(
      BadRequestException,
    );
    expect(s3.uploadFile).not.toHaveBeenCalled();
  });

  it('sube la foto propia cuando no se pasa userId', async () => {
    const result = await controller.upload(makeFile('image/png'), currentUser);

    expect(s3.uploadFile).toHaveBeenCalledWith(currentUser.userId, expect.anything());
    expect(usersService.findById).not.toHaveBeenCalled();
    expect(usersService.setAvatarKey).toHaveBeenCalledWith(currentUser.userId, 'uploads/user-1/pic.png');
    expect(result).toEqual({ url: 'https://signed.example/pic.png', key: 'uploads/user-1/pic.png' });
  });

  it('sube la foto de otro usuario cuando se pasa userId, validando que exista', async () => {
    usersService.findById.mockResolvedValue({ id: 'user-2' });

    await controller.upload(makeFile('image/jpeg'), currentUser, 'user-2');

    expect(usersService.findById).toHaveBeenCalledWith('user-2');
    expect(s3.uploadFile).toHaveBeenCalledWith('user-2', expect.anything());
    expect(usersService.setAvatarKey).toHaveBeenCalledWith('user-2', 'uploads/user-1/pic.png');
  });

  it('acepta los 4 tipos MIME permitidos', async () => {
    for (const mime of ['image/png', 'image/jpeg', 'image/webp', 'image/gif']) {
      await expect(controller.upload(makeFile(mime), currentUser)).resolves.toBeDefined();
    }
  });
});

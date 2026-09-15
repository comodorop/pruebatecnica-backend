import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Ya existe un usuario con ese email');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        password: passwordHash,
      },
    });

    return this.sanitize(user);
  }

  async findAll() {
    const users = await this.prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
    return Promise.all(users.map((user) => this.sanitize(user)));
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return this.sanitize(user);
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.prisma.user.findUniqueOrThrow({ where: { id } }).catch(() => {
      throw new NotFoundException('Usuario no encontrado');
    });

    if (dto.email) {
      const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (existing && existing.id !== id) {
        throw new ConflictException('Ya existe un usuario con ese email');
      }
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.email ? { email: dto.email } : {}),
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.password ? { password: await bcrypt.hash(dto.password, SALT_ROUNDS) } : {}),
      },
    });

    return this.sanitize(user);
  }

  /** El bucket de imágenes es privado: aquí se guarda solo la key de S3, nunca una URL. */
  async setAvatarKey(id: string, avatarKey: string) {
    const user = await this.prisma.user.update({ where: { id }, data: { avatarUrl: avatarKey } });
    return this.sanitize(user);
  }

  private async sanitize(user: { password: string; avatarUrl: string | null; [key: string]: unknown }) {
    const { password, avatarUrl, ...rest } = user;
    return {
      ...rest,
      avatarUrl: avatarUrl ? await this.s3Service.getPresignedUrl(avatarUrl) : null,
    };
  }
}

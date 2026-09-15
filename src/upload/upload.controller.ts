import {
  BadRequestException,
  Body,
  Controller,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';
import { S3Service } from '../s3/s3.service';
import { UsersService } from '../users/users.service';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

@ApiTags('upload')
@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
  constructor(
    private readonly s3Service: S3Service,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE_BYTES })],
      }),
    )
    file: Express.Multer.File,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body('userId') targetUserId?: string,
  ) {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Tipo de archivo no permitido. Usa PNG, JPEG, WEBP o GIF.');
    }

    // Permite subir la foto de perfil propia o, si se indica userId, la de otro
    // usuario gestionado desde el módulo de administración de usuarios.
    const ownerId = targetUserId || currentUser.userId;
    if (targetUserId) {
      await this.usersService.findById(targetUserId);
    }

    const { key, url } = await this.s3Service.uploadFile(ownerId, file);
    // Se guarda la key (el bucket es privado); avatarUrl se sirve firmado en cada lectura.
    await this.usersService.setAvatarKey(ownerId, key);

    return { url, key };
  }
}

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';

const PRESIGNED_URL_EXPIRY_SECONDS = 3600;

@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>('aws.imagesBucket')!;
    this.s3Client = new S3Client({
      region: this.config.get<string>('aws.region')!,
      credentials: {
        accessKeyId: this.config.get<string>('aws.accessKeyId')!,
        secretAccessKey: this.config.get<string>('aws.secretAccessKey')!,
      },
    });
  }

  async uploadFile(userId: string, file: Express.Multer.File) {
    const key = `uploads/${userId}/${randomUUID()}-${file.originalname}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return { key, url: await this.getPresignedUrl(key) };
  }

  /**
   * El bucket es privado (bloqueo de acceso público por defecto de AWS), así que
   * las imágenes se sirven vía URL firmada de corta duración en lugar de una URL
   * directa. Se guarda solo la `key` en BD y se firma de nuevo en cada lectura.
   */
  async getPresignedUrl(key: string): Promise<string> {
    return getSignedUrl(this.s3Client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: PRESIGNED_URL_EXPIRY_SECONDS,
    });
  }
}

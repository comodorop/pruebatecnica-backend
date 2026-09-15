import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { S3Module } from './s3/s3.module';
import { ObservabilityModule } from './observability/observability.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { UploadModule } from './upload/upload.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    PrismaModule,
    S3Module,
    ObservabilityModule,
    AuthModule,
    UsersModule,
    UploadModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

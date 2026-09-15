import 'dotenv/config';
import './observability/tracing';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { loadSecrets } from './config/load-secrets';

async function bootstrap() {
  await loadSecrets();

  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  const allowedOrigin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000';
  app.enableCors({
    origin: allowedOrigin,
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Prueba Tecnica API')
    .setDescription('Auth + Users + Upload a S3')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 4000;
  await app.listen(port, '0.0.0.0');
}

bootstrap();

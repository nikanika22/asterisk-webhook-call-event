import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Enable CORS
  app.enableCors({ origin: '*' });

  // Global prefix — tất cả routes dùng /api theo chuẩn RESTful
  app.setGlobalPrefix('api');

  // Graceful shutdown
  app.enableShutdownHooks();

  const configService = app.get(ConfigService);
  const port = configService.get<number>('SOCKET_PORT') || 3000;

  await app.listen(port);
  logger.log(`[Main Server] listening on port ${port}`);
}

bootstrap();

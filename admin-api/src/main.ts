import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { config } from './config';
import type { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use((request: Request, response: Response, next: NextFunction) => {
    if (request.headers.authorization !== `Bearer ${config.adminToken}`) {
      response.status(401).json({ error: 'Unauthorized' });
      return;
    }

    next();
  });
  await app.listen(config.adminPort);
}
void bootstrap();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Habilitar CORS para desarrollo
  app.enableCors({
    origin: true, // Permite cualquier origen en desarrollo. En producción, usar la URL real.
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Servir archivos estáticos subidos a la carpeta uploads
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  await app.listen(3000);
}
bootstrap();
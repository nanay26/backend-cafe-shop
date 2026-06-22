import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import 'dotenv/config';

let appPromise: Promise<NestExpressApplication> | null = null;

function configureApp(app: NestExpressApplication) {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useStaticAssets(join(process.cwd(), 'public'), {
    prefix: '/public',
  });
  app.useStaticAssets(join(process.cwd(), 'public'), {
    prefix: '/',
  });

  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, ngrok-skip-browser-warning',
  });

  return app;
}

export async function getNestApp(): Promise<NestExpressApplication> {
  if (!appPromise) {
    appPromise = NestFactory.create<NestExpressApplication>(AppModule).then(
      configureApp,
    );
  }

  return appPromise;
}

export async function startLocalServer() {
  const app = await getNestApp();
  const port = Number(process.env.PORT) || 8080;

  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Server listening on 0.0.0.0:${port}`);
  console.log(`🖼️  Folder Uploads: http://0.0.0.0:${port}/public/uploads/`);
}

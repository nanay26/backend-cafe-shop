import { NestFactory } from '@nestjs/core';
import {
  ExpressAdapter,
  NestExpressApplication,
} from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import { ValidationPipe } from '@nestjs/common';
import express, { Request, Response } from 'express';
import { join } from 'path';

const server = express();
let app: NestExpressApplication;
let bootstrapError: Record<string, unknown> | null = null;

async function bootstrap(): Promise<void> {
  if (!app) {
    try {
      const allowedOrigins = (process.env.FRONTEND_URL || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

      app = await NestFactory.create<NestExpressApplication>(
        AppModule,
        new ExpressAdapter(server),
      );

      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          transform: true,
          forbidNonWhitelisted: true,
        }),
      );

      // Serve file statis untuk image menu yang disimpan di folder public.
      // Vercel me-rewrite request ke function ini, jadi static asset harus
      // di-mount dari dalam serverless handler juga.
      app.useStaticAssets(join(process.cwd(), 'public'), {
        prefix: '/public',
      });
      app.useStaticAssets(join(process.cwd(), 'public'), {
        prefix: '/',
      });

      app.enableCors({
        origin: allowedOrigins.length > 0 ? allowedOrigins : true,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        credentials: true,
        allowedHeaders: 'Content-Type, Accept, ngrok-skip-browser-warning',
      });

      await app.init();
    } catch (err: unknown) {
      const error = err as Error;
      bootstrapError = {
        message: error?.message || 'Unknown error during bootstrap',
        stack: error?.stack || '',
        name: error?.name || 'Error',
      };
      console.error('Bootstrap error:', err);
    }
  }
}

export default async (req: Request, res: Response): Promise<void> => {
  try {
    await bootstrap();
    if (bootstrapError) {
      res.status(500).json({
        error: 'Bootstrap failed',
        details: bootstrapError,
      });
      return;
    }
    server(req, res);
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({
      error: 'Request handling failed',
      message: error?.message || 'Unknown error',
      stack: error?.stack || '',
    });
  }
};

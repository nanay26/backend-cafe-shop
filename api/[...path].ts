import { VercelRequest, VercelResponse } from '@vercel/node';
import { getNestApp } from '../src/app.bootstrap';

let cachedApp: any = null;

async function getApp() {
  if (cachedApp) {
    return cachedApp;
  }
  
  const app = await getNestApp();
  cachedApp = app;
  return app;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const app = await getApp();
  
  // Handle the request with NestJS
  const expressApp = app.getHttpAdapter().getInstance();
  
  return new Promise((resolve, reject) => {
    expressApp(req, res, (err: any) => {
      if (err) reject(err);
      else resolve(res);
    });
  });
}

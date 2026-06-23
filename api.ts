import { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

const app = express();
app.use(express.json());

// Simple auth endpoint
app.post('/api/auth/mobile-login', async (req: any, res: any) => {
  const { username, password } = req.body;

  const envUsername = process.env.ADMIN_USERNAME || 'admin_tskopi';
  const envHash = process.env.ADMIN_PASSWORD_HASH?.trim() || '';
  const finalHash = envHash.startsWith('$2b$')
    ? envHash
    : '$2b$10$ckMiA9703.q7sgzDSvDcfOfm.8ZbBi9Ewd558mOktl.W.SIYj1gMq';

  const isUserValid = username === envUsername;
  const isPassValid = isUserValid ? bcrypt.compareSync(password, finalHash) : false;

  if (!isUserValid || !isPassValid) {
    return res.status(401).json({ message: 'Username atau password salah' });
  }

  const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
  const jwtService = new JwtService({ secret: jwtSecret, signOptions: { expiresIn: '8h' } });
  const token = jwtService.sign({ role: 'admin' });

  return res.json({ token, role: 'admin' });
});

// Health check
app.get('/', (req: any, res: any) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

export default function handler(req: VercelRequest, res: VercelResponse) {
  console.log('Handler called:', req.url, req.method);
  return app(req, res);
}

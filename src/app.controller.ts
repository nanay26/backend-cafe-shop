import { Controller, Get, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AppService } from './app.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Throttle } from '@nestjs/throttler';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly jwtService: JwtService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('api/auth/mobile-login')
  async mobileLogin(@Body() body: { username: string; password: string }) {
    const { username, password } = body;

    const envUsername = process.env.ADMIN_USERNAME || 'admin_tskopi';
    const envHash = process.env.ADMIN_PASSWORD_HASH?.trim() || '';
    const finalHash = envHash.startsWith('$2b$')
      ? envHash
      : '$2b$10$ckMiA9703.q7sgzDSvDcfOfm.8ZbBi9Ewd558mOktl.W.SIYj1gMq';

    const isUserValid = username === envUsername;
    const isPassValid = isUserValid ? bcrypt.compareSync(password, finalHash) : false;

    if (!isUserValid || !isPassValid) {
      throw new UnauthorizedException('Username atau password salah');
    }

    const token = this.jwtService.sign({ role: 'admin' });
    return { token, role: 'admin' };
  }
}

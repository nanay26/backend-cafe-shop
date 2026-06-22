import { Logger, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    new Logger('AuthModule').warn(
      'JWT_SECRET tidak di-set! Menggunakan fallback-secret. ' +
      'INI TIDAK AMAN UNTUK PRODUCTION! Tambahkan JWT_SECRET ke file .env',
    );
  }
  return secret || 'fallback-secret';
};

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: getJwtSecret(),
      signOptions: { expiresIn: '8h' },
    }),
  ],
  providers: [JwtStrategy],
  exports: [JwtStrategy, PassportModule, JwtModule],
})
export class AuthModule {}

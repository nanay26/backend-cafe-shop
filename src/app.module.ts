import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { OrdersModule } from './orders/orders.module';
import { MenuModule } from './menu/menu.module';
import { ChatModule } from './chat/chat.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    // Rate limiting global: maks 100 request per menit per IP
    // ChatController override dengan limit lebih ketat (20/menit)
    ThrottlerModule.forRoot([
      {
        ttl: 60000,  // 1 menit window
        limit: 100,  // default limit untuk semua endpoint
      },
    ]),
    PrismaModule,
    OrdersModule,
    MenuModule,
    ChatModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // ThrottlerGuard sebagai global guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

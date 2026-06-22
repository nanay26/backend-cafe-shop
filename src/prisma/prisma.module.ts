import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PrismaController } from './prisma.controller'; // IMPORT CONTROLLER

@Module({
  controllers: [PrismaController], // TAMBAHKAN DI SINI
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}

import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma.service';

interface TestResult {
  test: number;
}

@Controller('test')
export class PrismaController {
  constructor(private prisma: PrismaService) {}

  @Get('database')
  async testDatabase() {
    try {
      const result = await this.prisma.$queryRaw<TestResult[]>`
        SELECT 1 as test
      `;

      return {
        success: true,
        message: 'Database connected!',
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

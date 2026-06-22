import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Patch,
  Delete,
  BadRequestException,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { OrdersService, AnalyticsResponse } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto/create-order.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('api/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body()
    body: CreateOrderDto,
  ) {
    if (!body.customerName || !body.customerName.trim()) {
      throw new BadRequestException('Customer name is required');
    }
    if (!body.items || body.items.length === 0) {
      throw new BadRequestException('Order harus memiliki minimal satu item');
    }
    if (body.total < 0) {
      throw new BadRequestException('Total tidak boleh negatif');
    }
    return this.ordersService.create(body);
  }

  @Get('analytics')
  async getAnalytics(): Promise<AnalyticsResponse> {
    return this.ordersService.getAnalytics();
  }

  @Get()
  async findAll() {
    return this.ordersService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id/status')
  @UseGuards(AuthGuard('jwt'))
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: string; paymentMethod?: string },
  ) {
    if (!body.status) {
      throw new BadRequestException('Status wajib dikirim');
    }
    return this.ordersService.updateStatus(id, body.status, body.paymentMethod);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.remove(id);
  }
}

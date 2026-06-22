import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// 1. Definisikan Itemnya dulu
export class OrderItemDto {
  @IsNumber()
  menuId: number;

  @IsString()
  @Matches(/^[^<>]*$/, {
    message: 'Nama item tidak boleh mengandung karakter HTML',
  })
  name: string;

  @IsNumber()
  price: number;

  @IsNumber()
  qty: number;

  @IsString()
  variant: string;

  @IsOptional()
  @IsString()
  @Matches(/^[^<>]*$/, {
    message: 'Catatan tidak boleh mengandung karakter HTML',
  })
  note?: string;
}

// 2. Definisikan Order-nya (HANYA SEKALI SAJA)
export class CreateOrderDto {
  @IsString()
  @Matches(/^[^<>]*$/, {
    message: 'Nama pelanggan tidak boleh mengandung karakter HTML',
  })
  customerName: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsNumber()
  total: number;
}

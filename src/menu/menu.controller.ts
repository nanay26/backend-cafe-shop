import {
  Controller,
  Post,
  Get,
  Param,
  Delete,
  Put,
  Body,
  UploadedFile,
  UseInterceptors,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { MenuService, UpdateMenuDto } from './menu.service';
import { AuthGuard } from '@nestjs/passport';

interface CreateMenuDto {
  name: string;
  price: string;
  description: string;
  category: string;
  image?: string;
}

const imageFileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file gambar (JPG, JPEG, PNG, WEBP) yang diizinkan'), false);
  }
};

const multerOptions = {
  storage: memoryStorage(),
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
};

function toDataUrl(file: Express.Multer.File) {
  return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
}

@Controller('api/menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Post('chat')
  async chat(@Body('message') message: string) {
    return this.menuService.getChatResponse(message);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('image', multerOptions))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: CreateMenuDto,
  ) {
    const updateData: UpdateMenuDto = {
      name: body.name,
      price: parseFloat(body.price),
      description: body.description,
      category: body.category,
    };

    if (file) {
      updateData.image = toDataUrl(file);
    } else if (body.image?.trim()) {
      updateData.image = body.image.trim();
    }

    return this.menuService.updateMenu(id, updateData);
  }

  @Post('upload')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('image', multerOptions))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: CreateMenuDto,
  ) {
    return this.menuService.createMenu({
      name: body.name,
      price: parseFloat(body.price),
      description: body.description,
      category: body.category,
      image: file ? toDataUrl(file) : body.image?.trim() || '',
    });
  }

  @Get()
  async findAll() {
    return this.menuService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.menuService.findOne(id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.menuService.remove(id);
  }
}

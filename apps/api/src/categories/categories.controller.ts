import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RoleName } from '@tica/database';
import { PrismaService } from '../prisma/prisma.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateCategoryDto } from './dto/category.dto';

@ApiTags('categories')
@ApiBearerAuth()
@Controller('categories')
export class CategoriesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Lista categorias.' })
  list() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Cria uma categoria.' })
  create(@Body() body: CreateCategoryDto) {
    return this.prisma.category.create({ data: body });
  }
}

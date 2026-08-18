import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service';

@ApiTags('search')
@ApiBearerAuth()
@Controller('search')
export class SearchController {
  constructor(private search: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Busca global (cursos, trilhas, aulas, labs, questões).' })
  @ApiQuery({ name: 'q', required: true })
  find(@Query('q') q: string) {
    return this.search.search(q);
  }
}

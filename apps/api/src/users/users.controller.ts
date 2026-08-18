import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { RoleName } from '@tica/database';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @Get('me/profile')
  @ApiOperation({ summary: 'Perfil do próprio aluno (XP, badges, competências).' })
  myProfile(@CurrentUser() user: AuthUser) {
    return this.users.profile(user.id);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.MANAGER)
  @Get()
  @ApiOperation({ summary: 'Lista usuários (admin/gestor).' })
  findAll() {
    return this.users.findAll();
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.MANAGER)
  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de um usuário.' })
  findOne(@Param('id') id: string) {
    return this.users.findOne(id);
  }
}

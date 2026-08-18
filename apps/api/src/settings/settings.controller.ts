import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RoleName } from '@tica/database';
import { Roles } from '../common/decorators/roles.decorator';
import { UpdateSecuritySettingsDto } from './dto/security-settings.dto';

/**
 * Configurações de segurança da plataforma. Mantidas em memória neste scaffold
 * (sem migração); em produção, persistir em tabela dedicada + audit log.
 */
const settings = {
  mfaRequired: true,
  ssoEntraId: true,
  scimProvisioning: false,
  passwordPolicy: 'STRONG',
  sessionTimeoutMin: 30,
  maxLoginAttempts: 5,
  apiRateLimit: true,
  restrictByIp: false,
  auditAdminActions: true,
  labNetworkIsolation: true,
  labAutoDestroy: true,
};

@ApiTags('security-settings')
@ApiBearerAuth()
@Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN)
@Controller('admin/security-settings')
export class SettingsController {
  @Get()
  @ApiOperation({ summary: 'Lê as configurações de segurança.' })
  get() {
    return settings;
  }

  @Put()
  @ApiOperation({ summary: 'Atualiza as configurações de segurança.' })
  update(@Body() body: UpdateSecuritySettingsDto) {
    // Só chaves whitelisted pelo DTO chegam aqui (ValidationPipe forbidNonWhitelisted).
    Object.assign(settings, body);
    return settings;
  }
}

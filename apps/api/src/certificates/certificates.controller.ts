import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RoleName } from '@tica/database';
import { CertificatesService } from './certificates.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { IssueCertificateDto } from './dto/certificate.dto';

@ApiTags('certificates')
@Controller()
export class CertificatesController {
  constructor(private certificates: CertificatesService) {}

  @ApiBearerAuth()
  @Get('certificates')
  @ApiOperation({ summary: 'Certificados do aluno autenticado.' })
  mine(@CurrentUser() user: AuthUser) {
    return this.certificates.listForUser(user.id);
  }

  @ApiBearerAuth()
  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN)
  @Post('certificates/issue')
  @ApiOperation({ summary: 'Emite um certificado para um usuário/trilha.' })
  issue(@Body() body: IssueCertificateDto) {
    return this.certificates.issue(body.userId, body.learningPathId);
  }

  @Public()
  @Get('verify/certificate/:publicId')
  @ApiOperation({ summary: 'Validação pública de um certificado por ID.' })
  verify(@Param('publicId') publicId: string) {
    return this.certificates.verify(publicId);
  }
}

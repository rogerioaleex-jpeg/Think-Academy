import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

// Chaves explícitas — impede mass-assignment de propriedades arbitrárias.
export class UpdateSecuritySettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() mfaRequired?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() ssoEntraId?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() scimProvisioning?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() passwordPolicy?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(1440) sessionTimeoutMin?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(20) maxLoginAttempts?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() apiRateLimit?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() restrictByIp?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() auditAdminActions?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() labNetworkIsolation?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() labAutoDestroy?: boolean;
}

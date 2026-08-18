import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUrl, Min, MaxLength } from 'class-validator';

export class CreateVideoDto {
  @ApiProperty() @IsString() @MaxLength(200) title!: string;
  // Um dos dois é obrigatório (validado no service): storageKey (bucket próprio,
  // ainda não conectado) ou externalUrl (YouTube/Vimeo/etc., usado hoje).
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) storageKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsUrl({ require_protocol: true }) @MaxLength(2000) externalUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) durationSec?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) sizeBytes?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) thumbnailKey?: string;
}

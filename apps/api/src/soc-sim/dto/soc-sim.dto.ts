import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { IncidentSeverity, IncidentVerdict } from '@tica/database';

export class SubmitIncidentDto {
  @ApiPropertyOptional({ enum: IncidentSeverity }) @IsOptional() @IsEnum(IncidentSeverity) chosenSeverity?: IncidentSeverity;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) chosenTechnique?: string;
  @ApiPropertyOptional({ enum: IncidentVerdict }) @IsOptional() @IsEnum(IncidentVerdict) chosenVerdict?: IncidentVerdict;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) actionTaken?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() kqlUsed?: boolean;
}

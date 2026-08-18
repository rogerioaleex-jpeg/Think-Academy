import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { CompetencyLevel, CompetencyEvidence } from '@tica/database';

export class AssessCompetencyDto {
  @ApiProperty() @IsString() userId!: string;
  @ApiProperty({ example: 'SIEM' }) @IsString() competencyKey!: string;
  @ApiProperty({ enum: CompetencyLevel }) @IsEnum(CompetencyLevel) level!: CompetencyLevel;
  @ApiPropertyOptional({ example: 82 }) @IsOptional() @IsInt() @Min(0) @Max(100) scorePct?: number;
  @ApiPropertyOptional({ enum: CompetencyEvidence }) @IsOptional() @IsEnum(CompetencyEvidence) evidence?: CompetencyEvidence;
  @ApiPropertyOptional() @IsOptional() @IsString() evidenceRef?: string;
}

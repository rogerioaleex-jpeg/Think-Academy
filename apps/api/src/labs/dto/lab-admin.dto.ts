import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { LabCategory, Difficulty, LabDriver, VmOsType, ContentStatus } from '@tica/database';

export class CreateLabDto {
  @ApiProperty() @IsString() @MaxLength(160) title!: string;
  @ApiProperty() @IsString() @Matches(/^[a-z0-9-]+$/) slug!: string;
  @ApiProperty({ enum: LabCategory }) @IsEnum(LabCategory) category!: LabCategory;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) objective?: string;
  @ApiPropertyOptional({ enum: Difficulty }) @IsOptional() @IsEnum(Difficulty) difficulty?: Difficulty;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(600) durationMin?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(100000) xpReward?: number;
  @ApiPropertyOptional({ enum: LabDriver }) @IsOptional() @IsEnum(LabDriver) driver?: LabDriver;
  @ApiPropertyOptional({ enum: VmOsType, description: 'Só relevante quando driver = VM.' }) @IsOptional() @IsEnum(VmOsType) osType?: VmOsType;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) vmVersion?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) dockerImage?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cpuLimit?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(128) @Max(16384) memoryLimitMb?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(1440) timeoutMin?: number;
  @ApiPropertyOptional({ type: [Number] }) @IsOptional() @IsArray() @IsInt({ each: true }) exposedPorts?: number[];
}

/** Todos os campos opcionais — PATCH parcial. Sem `slug` de propósito: mudar
 * o slug de um lab já publicado quebraria links/bookmarks existentes; quem
 * precisar disso hoje deve criar um lab novo. */
export class UpdateLabDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) title?: string;
  @ApiPropertyOptional({ enum: LabCategory }) @IsOptional() @IsEnum(LabCategory) category?: LabCategory;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) objective?: string;
  @ApiPropertyOptional({ enum: Difficulty }) @IsOptional() @IsEnum(Difficulty) difficulty?: Difficulty;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(600) durationMin?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(100000) xpReward?: number;
  @ApiPropertyOptional({ enum: LabDriver }) @IsOptional() @IsEnum(LabDriver) driver?: LabDriver;
  @ApiPropertyOptional({ enum: VmOsType, description: 'Só relevante quando driver = VM.' }) @IsOptional() @IsEnum(VmOsType) osType?: VmOsType;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) vmVersion?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) dockerImage?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cpuLimit?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(128) @Max(16384) memoryLimitMb?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(1440) timeoutMin?: number;
  @ApiPropertyOptional({ type: [Number] }) @IsOptional() @IsArray() @IsInt({ each: true }) exposedPorts?: number[];
  @ApiPropertyOptional({ enum: ContentStatus }) @IsOptional() @IsEnum(ContentStatus) status?: ContentStatus;
}

export class AddChallengeDto {
  @ApiProperty() @IsString() @MaxLength(200) title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(10000) points?: number;
  @ApiProperty() @IsString() @MaxLength(300) flag!: string;
}

export class AddHintDto {
  @ApiProperty() @IsString() @MaxLength(1000) text!: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(10000) costXp?: number;
}

export class SubmitChallengeDto {
  @ApiProperty() @IsString() challengeId!: string;
  @ApiProperty() @IsString() @MaxLength(500) answer!: string;
}

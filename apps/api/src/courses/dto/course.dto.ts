import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min, IsArray, ArrayMaxSize } from 'class-validator';
import { Difficulty, LessonType } from '@tica/database';

export class CreateCourseDto {
  @ApiProperty() @IsString() title!: string;
  @ApiProperty() @IsString() slug!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shortDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ enum: Difficulty }) @IsOptional() @IsEnum(Difficulty) difficulty?: Difficulty;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) estimatedHours?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string;
  @ApiPropertyOptional({ description: 'Prova aplicada ao concluir o curso (id de um Exam existente); null para remover.' })
  @IsOptional() @IsString() finalExamId?: string | null;
  @ApiPropertyOptional({ type: [String], description: 'Bullets de "O que você vai aprender".' })
  @IsOptional() @IsArray() @IsString({ each: true }) learningOutcomes?: string[];
}

export class UpdateCourseDto extends PartialType(CreateCourseDto) {}

export class SetCourseCompetenciesDto {
  @ApiProperty({ type: [String] })
  @IsArray() @IsString({ each: true })
  competencyIds!: string[];
}

export class SetCourseTagsDto {
  @ApiProperty({ type: [String], description: 'Nomes das tags; criadas automaticamente se não existirem.' })
  @IsArray() @IsString({ each: true })
  tags!: string[];
}

export class CreateModuleDto {
  @ApiProperty() @IsString() title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() order?: number;
}

export class CreateLessonDto {
  @ApiProperty() @IsString() title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() order?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() videoId?: string;
  @ApiPropertyOptional({ enum: LessonType }) @IsOptional() @IsEnum(LessonType) type?: LessonType;
  @ApiPropertyOptional({ description: 'Corpo em markdown — usado quando type=TEXT.' })
  @IsOptional() @IsString() content?: string;
  @ApiPropertyOptional({ description: 'Id de um Exam existente — usado quando type=QUIZ.' })
  @IsOptional() @IsString() examId?: string;
}

export class BulkAssignDto {
  @ApiProperty({ type: [String] })
  @IsArray() @ArrayMaxSize(2000) @IsString({ each: true })
  userIds!: string[];
}

export class UpdateProgressDto {
  @ApiProperty({ example: 75 }) @IsInt() @Min(0) watchedPct!: number;
  @ApiPropertyOptional({ example: 320 }) @IsOptional() @IsInt() @Min(0) resumePositionSec?: number;
}

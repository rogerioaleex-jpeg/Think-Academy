import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min, IsArray, ArrayMaxSize } from 'class-validator';
import { Difficulty } from '@tica/database';

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
}

export class UpdateCourseDto extends PartialType(CreateCourseDto) {}

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

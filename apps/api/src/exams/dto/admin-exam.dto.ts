import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Difficulty, ExamKind, QuestionType } from '@tica/database';

export class OptionInputDto {
  @ApiProperty() @IsString() text!: string;
  @ApiProperty() isCorrect!: boolean;
}

export class CreateQuestionDto {
  @ApiProperty() @IsString() prompt!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() explanation?: string;
  @ApiPropertyOptional({ enum: QuestionType }) @IsOptional() @IsEnum(QuestionType) type?: QuestionType;
  @ApiPropertyOptional({ enum: Difficulty }) @IsOptional() @IsEnum(Difficulty) difficulty?: Difficulty;
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() technology?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reference?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) points?: number;
  @ApiProperty({ type: [OptionInputDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => OptionInputDto)
  options!: OptionInputDto[];
}

export class CreateExamDto {
  @ApiProperty() @IsString() title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ enum: ExamKind }) @IsOptional() @IsEnum(ExamKind) kind?: ExamKind;
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
  @ApiPropertyOptional({ enum: Difficulty }) @IsOptional() @IsEnum(Difficulty) difficulty?: Difficulty;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) questionCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) durationMin?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) passScorePct?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) maxAttempts?: number;
}

export class AttachQuestionsDto {
  @ApiProperty({ type: [String] })
  @IsArray() @IsString({ each: true })
  questionIds!: string[];
}

export class ImportCsvDto {
  @ApiProperty({ description: 'CSV: prompt,category,difficulty,optA,optB,optC,optD,correctIndex(0-3),explanation' })
  @IsString() csv!: string;
}

export class ImportToExamDto {
  @ApiProperty() @IsString() examTitle!: string;
  @ApiPropertyOptional({ enum: ExamKind }) @IsOptional() @IsEnum(ExamKind) kind?: ExamKind;
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) durationMin?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) passScorePct?: number;
  @ApiProperty({ description: 'Mesmo formato do import de questões.' })
  @IsString() csv!: string;
}

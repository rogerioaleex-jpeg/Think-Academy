import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, MaxLength, ArrayMaxSize } from 'class-validator';

export class CreateThreadDto {
  @ApiProperty() @IsString() @MaxLength(160) title!: string;
  @ApiProperty() @IsString() @MaxLength(8000) body!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) category?: string;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @ArrayMaxSize(8) @IsString({ each: true })
  tags?: string[];
}

export class ReplyDto {
  @ApiProperty() @IsString() @MaxLength(8000) body!: string;
}

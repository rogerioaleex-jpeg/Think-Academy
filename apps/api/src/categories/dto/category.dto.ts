import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty() @IsString() @MaxLength(80) name!: string;
  @ApiProperty() @IsString() @Matches(/^[a-z0-9-]+$/, { message: 'slug: apenas minúsculas, números e hífens' }) slug!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) icon?: string;
}

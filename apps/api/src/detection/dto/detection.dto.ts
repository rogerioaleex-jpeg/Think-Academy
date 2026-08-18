import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class SubmitKqlDto {
  @ApiProperty() @IsString() @MaxLength(4000) kql!: string;
}

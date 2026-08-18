import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class IssueCertificateDto {
  @ApiProperty() @IsUUID() userId!: string;
  @ApiProperty() @IsUUID() learningPathId!: string;
}

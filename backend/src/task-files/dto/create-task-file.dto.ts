import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTaskFileDto {
  @IsString()
  @IsNotEmpty()
  originalName: string;

  @IsString()
  @IsNotEmpty()
  storagePath: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsString()
  sizeBytes?: string;
}

import { IsOptional, IsString, IsDateString, IsUUID } from 'class-validator';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  status?: string; // 'active' | 'archived' | 'completed' | 'on_hold'

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsUUID('4')
  client_id?: string | null;

  @IsOptional()
  @IsDateString()
  start_date?: string | null;

  @IsOptional()
  @IsDateString()
  end_date?: string | null;
}

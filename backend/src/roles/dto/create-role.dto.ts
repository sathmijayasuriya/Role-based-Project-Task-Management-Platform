import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string; // e.g. 'admin', 'manager', 'user'

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}

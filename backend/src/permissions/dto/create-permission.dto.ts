import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePermissionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string; // e.g. 'MANAGE_USERS', 'MANAGE_ROLES'

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}

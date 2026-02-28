import { CreateRoleDto } from './create-role.dto';
import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateRoleWithPermissionsDto extends CreateRoleDto {
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  permissionIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionNames?: string[];
}

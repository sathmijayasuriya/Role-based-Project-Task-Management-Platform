import { UpdateRoleDto } from './update-role.dto';
import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateRoleWithPermissionsDto extends UpdateRoleDto {
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  permissionIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionNames?: string[];
}

import { PartialType } from '@nestjs/mapped-types';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { CreateUserDto } from './create-user.dto';
import { UserStatus } from '../enums/user-status.enum';

export class UpdateUserAdminDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus; // 'active' | 'inactive' | 'pending' | 'banned'

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleNames?: string[]; // override roles if admin wants to update them
}

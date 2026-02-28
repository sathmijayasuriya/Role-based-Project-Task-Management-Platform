import { PartialType } from '@nestjs/mapped-types';
import { CreatePermissionDto } from './create-permission.dto';

export class UpdatePermissionDto extends PartialType(CreatePermissionDto) {}

// import { IsOptional, IsString, MaxLength } from 'class-validator';

// export class UpdatePermissionDto {
//   @IsOptional()
//   @IsString()
//   @MaxLength(100)
//   description?: string;
// }

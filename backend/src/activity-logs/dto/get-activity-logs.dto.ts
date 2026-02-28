import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class GetActivityLogsDto {
  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  pageSize?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  @Transform(({ value }) =>
    typeof value === 'string' ? (value.toUpperCase() as 'ASC' | 'DESC') : value,
  )
  sort?: 'ASC' | 'DESC';
}

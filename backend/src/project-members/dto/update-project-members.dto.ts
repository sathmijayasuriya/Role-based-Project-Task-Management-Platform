import { IsArray, IsOptional, ArrayUnique, Matches } from 'class-validator';

const UUID_LIKE_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export class UpdateProjectMembersDto {
  @IsOptional()
  @IsArray()
  @Matches(UUID_LIKE_REGEX, {
    each: true,
    message: 'each value in add must be a valid id',
  })
  @ArrayUnique()
  add?: string[];

  @IsOptional()
  @IsArray()
  @Matches(UUID_LIKE_REGEX, {
    each: true,
    message: 'each value in remove must be a valid id',
  })
  @ArrayUnique()
  remove?: string[];
}

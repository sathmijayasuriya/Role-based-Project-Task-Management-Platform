import { IsOptional, IsString, Matches } from 'class-validator';

const UUID_LIKE_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export class CreateProjectMemberDto {
  @Matches(UUID_LIKE_REGEX, {
    message: 'userId must be a valid id',
  })
  userId: string;

  @IsOptional()
  @IsString()
  assignedRole?: string;
}

import { IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateProfilePictureDto {
  @IsString()
  @IsUrl()
  profile_picture_url: string;
}

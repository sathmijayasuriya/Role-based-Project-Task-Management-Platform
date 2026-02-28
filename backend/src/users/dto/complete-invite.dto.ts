import { IsEmail, IsString, MinLength } from 'class-validator';

export class CompleteInviteDto {
  @IsEmail()
  email: string;

  @IsString()
  token: string;

  @IsString()
  @MinLength(8)
  newPassword: string;

  @IsString()
  @MinLength(8)
  confirmNewPassword: string;
}

import { IsEmail, IsString } from 'class-validator';

export class VerifyInviteDto {
  @IsEmail()
  email: string;

  @IsString()
  token: string;
}

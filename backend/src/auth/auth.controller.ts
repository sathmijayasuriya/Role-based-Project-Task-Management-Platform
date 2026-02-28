import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from 'src/users/dto/change-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';
import { Patch } from '@nestjs/common';
import { Req } from '@nestjs/common';
import { CompleteInviteDto } from 'src/users/dto/complete-invite.dto';
import { VerifyInviteDto } from 'src/users/dto/verify-invite.dto';

class LoginDto {
  email: string;
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const user = await this.authService.validateUser(dto.email, dto.password);
    return this.authService.login(user);
  }
  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  async changePassword(@Req() req, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.userId, dto);
  }

  @Post('complete-invite')
  async completeInvite(@Body() dto: CompleteInviteDto) {
    return this.authService.completeInvite(dto);
  }

  @Post('invite/verify')
  async verifyInvite(@Body() dto: VerifyInviteDto) {
    return this.authService.verifyInvite(dto);
  }
}

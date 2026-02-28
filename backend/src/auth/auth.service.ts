import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { User } from 'src/users/entities/user.entity';
import { ChangePasswordDto } from 'src/users/dto/change-password.dto';
import { CompleteInviteDto } from 'src/users/dto/complete-invite.dto';
import { VerifyInviteDto } from 'src/users/dto/verify-invite.dto';
import { ActivityLogsService } from 'src/activity-logs/activity-logs.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  /**
   * Validate user credentials (Email + Password)
   */
  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.usersService.findByEmailWithRoles(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.password_hash || user.status === 'pending') {
      throw new ForbiddenException(
        'Account is pending activation. Please set your password from the invite email.',
      );
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'active') {
      throw new ForbiddenException('User account is disabled');
    }
    return user;
  }

  /**
   * Prepare Payload (Roles + Permissions)
   */
  private extractUserClaims(user: User) {
    const roles = user.roles?.map((r) => r.name) ?? [];
    const permissions = user.roles?.flatMap((r) =>
      r.permissions ? r.permissions.map((p) => p.name) : [],
    );

    return { roles, permissions };
  }

  /**
   * Generate Access Token
   */
  async generateAccessToken(payload: any): Promise<string> {
    return this.jwtService.signAsync(payload, {
      expiresIn: process.env.JWT_EXPIRES_IN
        ? parseInt(process.env.JWT_EXPIRES_IN) // in seconds
        : 5000,
    });
  }

  /**
   * Login User + Return Token + Profile Data
   */
  async login(user: User) {
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { roles, permissions } = this.extractUserClaims(user);

    const payload = {
      sub: user.id,
      email: user.email,
      roles,
      permissions,
    };

    const accessToken = await this.generateAccessToken(payload);

    await this.activityLogsService.logEntityChange({
      entityType: 'user',
      entityId: user.id,
      action: 'LOGIN',
      after: {
        id: user.id,
        email: user.email,
      },
      meta: {
        roles,
        login_at: new Date().toISOString(),
      },
      userId: user.id,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        roles,
        permissions,
      },
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const { currentPassword, newPassword, confirmNewPassword } = dto;

    if (newPassword !== confirmNewPassword) {
      throw new BadRequestException('New password confirmation does not match');
    }

    if (newPassword.length < 8) {
      throw new BadRequestException(
        'New password must be at least 8 characters long',
      );
    }

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.password_hash) {
      throw new ForbiddenException(
        'Password is not set for this account. Please complete the invite flow.',
      );
    }

    // check current password
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // optionally prevent reusing same password
    const isSame = await bcrypt.compare(newPassword, user.password_hash);
    if (isSame) {
      throw new BadRequestException(
        'New password must be different from the current password',
      );
    }

    const password_hash = await bcrypt.hash(newPassword, 10);

    await this.usersService.updatePasswordHash(userId, password_hash);

    // Optional: revoke refresh tokens here if you want sessions to logout

    return { success: true };
  }

  async completeInvite(dto: CompleteInviteDto) {
    const user = await this.usersService.completeInvite(dto);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const loginResult = await this.login(user);
    return { success: true, ...loginResult };
  }

  async verifyInvite(dto: VerifyInviteDto) {
    return this.usersService.verifyInvite(dto);
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserAdminDto } from './dto/update-user-admin.dto';
import { In, IsNull } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CompleteInviteDto } from './dto/complete-invite.dto';
import { VerifyInviteDto } from './dto/verify-invite.dto';
import { User } from './entities/user.entity';
import { Role } from 'src/roles/entities/role.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { MailService } from '../mail/mail.service';
import { ActivityLogsService } from 'src/activity-logs/activity-logs.service';
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(EmailVerificationToken)
    private readonly emailVerificationRepo: Repository<EmailVerificationToken>,
    private readonly mailService: MailService,
    private readonly activityLogs: ActivityLogsService,
  ) {}

  async findByEmailWithRoles(email: string) {
    return this.userRepo.findOne({
      where: { email, is_deleted: false },
      relations: ['roles', 'roles.permissions'],
    });
  }

  async findById(id: string) {
    return this.userRepo.findOne({
      where: { id, is_deleted: false },
      relations: ['roles', 'roles.permissions'],
    });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const before = await this.findById(userId);
    await this.userRepo.update(userId, {
      ...dto,
      updated_at: new Date(),
    });
    const updated = await this.findById(userId);
    await this.activityLogs.logEntityChange({
      entityType: 'user',
      entityId: userId,
      action: 'UPDATE',
      before,
      after: updated,
      meta: { updatedFields: Object.keys(dto) },
    });
    return updated;
  }

  async softDelete(userId: string) {
    const before = await this.findById(userId);
    await this.userRepo.update(userId, {
      is_deleted: true,
      status: 'banned',
      deleted_at: new Date(),
    });
    await this.activityLogs.logEntityChange({
      entityType: 'user',
      entityId: userId,
      action: 'DELETE',
      before,
      after: {
        ...before,
        is_deleted: true,
        status: 'banned',
        deleted_at: new Date(),
      },
    });
    return { success: true };
  }

  async adminCreateUser(dto: CreateUserDto) {
    const { roleNames = [], ...rest } = dto;

    const existing = await this.userRepo.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new BadRequestException('Email already in use');
    }

    const user = this.userRepo.create({
      ...rest,
      status: 'pending',
      is_email_verified: false,
      is_deleted: false,
      password_hash: null,
    });

    if (roleNames.length) {
      const roles = await this.roleRepo.find({
        where: { name: In(roleNames) },
      });
      user.roles = roles;
    }

    const savedUser = await this.userRepo.save(user);

    const { rawToken, expires } = await this.createEmailVerificationToken(
      savedUser.id,
    );
    await this.sendInviteEmail(savedUser, rawToken, expires);

    return {
      id: savedUser.id,
      email: savedUser.email,
      first_name: savedUser.first_name,
      last_name: savedUser.last_name,
      status: savedUser.status,
      roles: user.roles?.map((r) => r.name) ?? [],
    };
  }

  async adminUpdateUser(id: string, dto: UpdateUserAdminDto) {
    const before = await this.findById(id);
    const { roleNames, ...rest } = dto;

    await this.userRepo.update(id, {
      ...rest,
      updated_at: new Date(),
    });

    if (roleNames) {
      const user = await this.userRepo.findOne({
        where: { id },
        relations: ['roles'],
      });
      const roles = await this.roleRepo.find({
        where: { name: In(roleNames) },
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      user.roles = roles;
      await this.userRepo.save(user);
    }

    const updated = await this.findById(id);

    await this.activityLogs.logEntityChange({
      entityType: 'user',
      entityId: id,
      action: 'UPDATE',
      before,
      after: updated,
      meta: {
        updatedFields: Object.keys(dto).filter(
          (key) => dto[key as keyof UpdateUserAdminDto] !== undefined,
        ),
      },
    });

    return updated;
  }

  async findAll(): Promise<User[]> {
    return this.userRepo.find({
      where: { is_deleted: false },
      relations: ['roles', 'roles.permissions'],
      order: { created_at: 'DESC' },
    });
  }

  async adminDeactivateUser(id: string) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.userRepo.update(id, {
      status: 'inactive',
      updated_at: new Date(),
    });

    const updated = await this.findById(id);

    await this.activityLogs.logEntityChange({
      entityType: 'user',
      entityId: id,
      action: 'UPDATE',
      before: user,
      after: updated,
      meta: { reason: 'deactivate' },
    });

    return updated;
  }

  async adminHardDeleteUser(id: string) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const deletePayload = {
      is_deleted: true,
      status: 'banned',
      deleted_at: new Date(),
      updated_at: new Date(),
    };

    await this.userRepo.update(id, deletePayload);

    await this.activityLogs.logEntityChange({
      entityType: 'user',
      entityId: id,
      action: 'DELETE',
      before: user,
      after: { ...user, ...deletePayload },
    });

    return { success: true };
  }

  async adminResetPassword(id: string, newPassword: string) {
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException(
        'New password must be at least 8 characters long',
      );
    }

    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const password_hash = await bcrypt.hash(newPassword, 10);

    await this.userRepo.update(id, {
      password_hash,
      updated_at: new Date(),
    });

    await this.activityLogs.logEntityChange({
      entityType: 'user',
      entityId: id,
      action: 'UPDATE',
      before: user,
      after: { ...user, password_hash: '<updated>', updated_at: new Date() },
      meta: { action: 'reset_password' },
    });

    return { success: true };
  }
  async updateProfilePicture(userId: string, profilePicturePath: string) {
    const before = await this.findById(userId);
    await this.userRepo.update(userId, {
      profile_picture_path: profilePicturePath,
      updated_at: new Date(),
    });

    const updated = await this.findById(userId);

    await this.activityLogs.logEntityChange({
      entityType: 'user',
      entityId: userId,
      action: 'UPDATE',
      before,
      after: updated,
      meta: { action: 'update_profile_picture' },
    });

    return updated;
  }
  async updatePasswordHash(userId: string, password_hash: string) {
    await this.userRepo.update(userId, {
      password_hash,
      updated_at: new Date(),
    });
  }

  async completeInvite(dto: CompleteInviteDto) {
    if (dto.newPassword !== dto.confirmNewPassword) {
      throw new BadRequestException('Password confirmation does not match');
    }

    const user = await this.userRepo.findOne({
      where: { email: dto.email, is_deleted: false },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status === 'banned') {
      throw new ForbiddenException('User is banned');
    }

    const matchingToken = await this.findValidInviteToken(user, dto.token);
    if (!matchingToken) {
      throw new BadRequestException('Invalid or expired token');
    }

    const password_hash = await bcrypt.hash(dto.newPassword, 10);

    await this.userRepo.update(user.id, {
      password_hash,
      status: 'active',
      is_email_verified: true,
      updated_at: new Date(),
    });

    await this.emailVerificationRepo.update(matchingToken.id, {
      used_at: new Date(),
    });

    return this.findById(user.id);
  }

  async searchUsers(options: {
    search?: string | null;
    page?: number | string;
    pageSize?: number | string;
  }) {
    const page = Math.max(1, Number(options.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(options.pageSize) || 20));
    const search = (options.search ?? '').toString().trim().toLowerCase();

    const qb = this.userRepo
      .createQueryBuilder('user')
      .where('user.is_deleted = false');

    if (search) {
      qb.andWhere(
        `(LOWER(user.first_name) LIKE :term OR LOWER(user.last_name) LIKE :term OR LOWER(user.email) LIKE :term)`,
        { term: `%${search}%` },
      );
    }

    qb.orderBy('user.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .select([
        'user.id',
        'user.first_name',
        'user.last_name',
        'user.email',
        'user.status',
        'user.profile_picture_path',
        'user.created_at',
      ]);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  private async createEmailVerificationToken(userId: string) {
    const rawToken = randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(rawToken, 10);

    const expires = new Date();
    expires.setDate(expires.getDate() + 2);

    const record = await this.emailVerificationRepo.save({
      user_id: userId,
      token: hashedToken,
      expires_at: expires,
    });

    return { rawToken, expires, record };
  }

  private async sendInviteEmail(user: User, token: string, expiresAt: Date) {
    const baseUrl = (process.env.APP_URL ?? 'http://localhost:4200').replace(
      /\/$/,
      '',
    );
    const inviteLink = `${baseUrl}/set-password?token=${token}&email=${encodeURIComponent(
      user.email,
    )}`;

    const displayName = [user.first_name, user.last_name]
      .filter(Boolean)
      .join(' ')
      .trim();

    await this.mailService.sendInviteEmail({
      to: user.email,
      name: displayName || user.email,
      inviteLink,
      expiresAt,
    });
  }

  private async findValidInviteToken(user: User, rawToken: string) {
    const now = new Date();
    const tokens = await this.emailVerificationRepo.find({
      where: { user_id: user.id, used_at: IsNull() },
      order: { created_at: 'DESC' },
    });

    for (const token of tokens) {
      if (token.expires_at < now) {
        continue;
      }
      const isMatch = await bcrypt.compare(rawToken, token.token);
      if (isMatch) {
        return token;
      }
    }
    return null;
  }

  async verifyInvite(dto: VerifyInviteDto) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email, is_deleted: false },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.status === 'banned') {
      throw new ForbiddenException('User is banned');
    }

    const token = await this.findValidInviteToken(user, dto.token);
    if (!token) {
      throw new BadRequestException('Invalid or expired token');
    }

    return { valid: true };
  }
}

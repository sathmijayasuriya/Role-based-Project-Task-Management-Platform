import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UsersService } from '../users.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { UpdateProfilePictureDto } from '../dto/update-profile-picture.dto';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { PermissionName } from 'src/auth/constants/permissions.constants';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get()
  @Permissions(PermissionName.VIEW_USERS, PermissionName.PROJECT_MEMBER_MANAGE)
  async listUsers(
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.usersService.searchUsers({ search, page, pageSize });
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Req() req) {
    return this.usersService.findById(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMe(@Req() req, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me')
  async deleteMe(@Req() req) {
    // soft delete: set is_deleted + status = 'banned'
    return this.usersService.softDelete(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/profile-picture')
  async updateProfilePicture(@Req() req, @Body() dto: UpdateProfilePictureDto) {
    return this.usersService.updateProfilePicture(
      req.user.userId,
      dto.profile_picture_url,
    );
  }
}

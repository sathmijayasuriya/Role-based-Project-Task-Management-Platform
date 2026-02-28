import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { UsersService } from '../users.service';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateUserDto } from '../../users/dto/create-user.dto';
import { UpdateUserAdminDto } from '../../users/dto/update-user-admin.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PermissionName } from '../../auth/constants/permissions.constants';
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('admin')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Permissions(PermissionName.MANAGE_USERS)
  async createUser(@Body() dto: CreateUserDto) {
    return this.usersService.adminCreateUser(dto);
  }

  @Get()
  async listUsers() {
    return this.usersService.findAll();
  }

  @Patch(':id')
  @Permissions(PermissionName.MANAGE_USERS)
  async updateUser(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateUserAdminDto,
  ) {
    return this.usersService.adminUpdateUser(id, dto);
  }

  @Patch(':id/deactivate')
  @Permissions(PermissionName.MANAGE_USERS)
  async deactivateUser(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.usersService.adminDeactivateUser(id);
  }

  @Delete(':id')
  @Permissions(PermissionName.MANAGE_USERS)
  async deleteUser(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.usersService.adminHardDeleteUser(id);
  }

  @Patch(':id/reset-password')
  @Permissions(PermissionName.MANAGE_USERS)
  async resetPassword(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.usersService.adminResetPassword(id, newPassword);
  }
}

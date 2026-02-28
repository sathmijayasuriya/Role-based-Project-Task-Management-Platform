import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Delete,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PermissionName } from 'src/auth/constants/permissions.constants';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { CreateRoleWithPermissionsDto } from './dto/create-role-with-permissions.dto';
import { UpdateRoleWithPermissionsDto } from './dto/update-role-with-permissions.dto';

@Controller('admin/roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions(PermissionName.MANAGE_ROLES, PermissionName.MANAGE_PERMISSIONS)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  async listRoles() {
    return this.rolesService.findAllWithPermissions();
  }

  @Get(':id')
  async getRole(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.rolesService.findOneWithPermissions(id);
  }

  // Replace entire permission set for a role
  @Patch(':id/permissions')
  async setRolePermissions(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateRolePermissionsDto,
  ) {
    return this.rolesService.setRolePermissions(id, dto);
  }

  @Post()
  async createRole(@Body() dto: CreateRoleWithPermissionsDto) {
    return this.rolesService.createRoleWithPermissions(dto);
  }

  @Patch(':id')
  async updateRole(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateRoleWithPermissionsDto,
  ) {
    return this.rolesService.updateRole(id, dto);
  }

  // Add a single permission
  @Post(':id/permissions')
  async addPermission(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body('permissionName') permissionName: string,
  ) {
    return this.rolesService.addPermission(id, permissionName);
  }

  // Remove a single permission
  @Delete(':id/permissions/:permissionName')
  async removePermission(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('permissionName') permissionName: string,
  ) {
    return this.rolesService.removePermission(id, permissionName);
  }
}

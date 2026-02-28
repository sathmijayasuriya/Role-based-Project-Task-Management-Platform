import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { Permission } from '../permissions/entities/permission.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { CreateRoleWithPermissionsDto } from './dto/create-role-with-permissions.dto';
import { UpdateRoleWithPermissionsDto } from './dto/update-role-with-permissions.dto';
@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
  ) {}

  async findAllWithPermissions() {
    return this.roleRepo.find({
      relations: ['permissions'],
      order: { name: 'ASC' },
    });
  }
  async findOneWithPermissions(roleId: string) {
    const role = await this.roleRepo.findOne({
      where: { id: roleId },
      relations: ['permissions'],
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return role;
  }

  // async createRole(dto: CreateRoleDto): Promise<Role> {
  //   const exists = await this.roleRepo.findOne({
  //     where: { name: dto.name },
  //   });
  //   if (exists) {
  //     throw new ConflictException(`Role '${dto.name}' already exists`);
  //   }

  //   const role = this.roleRepo.create({
  //     name: dto.name,
  //     description: dto.description,
  //   });

  //   return this.roleRepo.save(role);
  // }

  async createRoleWithPermissions(
    dto: CreateRoleWithPermissionsDto,
  ): Promise<Role> {
    const exists = await this.roleRepo.findOne({
      where: { name: dto.name },
    });
    if (exists) {
      throw new ConflictException(`Role '${dto.name}' already exists`);
    }

    const permissions = await this.resolvePermissions(
      dto.permissionIds ?? [],
      dto.permissionNames ?? [],
    );

    const role = this.roleRepo.create({
      name: dto.name,
      description: dto.description,
      permissions,
    });

    const saved = await this.roleRepo.save(role);
    return this.findOneWithPermissions(saved.id);
  }

  async findAll(): Promise<Role[]> {
    return this.roleRepo.find({
      relations: ['permissions'],
      order: { name: 'ASC' },
    });
  }

  async findById(id: string): Promise<Role> {
    const role = await this.roleRepo.findOne({
      where: { id },
      relations: ['permissions'],
    });
    if (!role) {
      throw new NotFoundException(`Role with id '${id}' not found`);
    }
    return role;
  }

  async findByName(name: string): Promise<Role> {
    const role = await this.roleRepo.findOne({
      where: { name },
      relations: ['permissions'],
    });
    if (!role) {
      throw new NotFoundException(`Role '${name}' not found`);
    }
    return role;
  }

  async updateRole(
    id: string,
    dto: UpdateRoleWithPermissionsDto,
  ): Promise<Role> {
    const role = await this.roleRepo.findOne({
      where: { id },
      relations: ['permissions'],
    });
    console.log('role id is', role);
    if (!role) {
      throw new NotFoundException(`Role with id '${id}' not found`);
    }

    if (dto.name !== undefined) {
      role.name = dto.name;
    }
    if (dto.description !== undefined) {
      role.description = dto.description;
    }

    const hasPermissionsPayload =
      dto.permissionIds !== undefined || dto.permissionNames !== undefined;

    if (hasPermissionsPayload) {
      const permissions = await this.resolvePermissions(
        dto.permissionIds ?? [],
        dto.permissionNames ?? [],
      );
      role.permissions = permissions;
    }

    await this.roleRepo.save(role);
    return this.findOneWithPermissions(id);
  }

  async deleteRole(id: string): Promise<{ success: boolean }> {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Role with id '${id}' not found`);
    }

    await this.roleRepo.remove(role);
    return { success: true };
  }

  /**
   * Replace all permissions of a role with the provided list
   */
  async setRolePermissions(roleId: string, dto: UpdateRolePermissionsDto) {
    const role = await this.roleRepo.findOne({
      where: { id: roleId },
      relations: ['permissions'],
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const permissionIds = dto.permissionIds?.filter(Boolean) ?? [];
    const permissionNames = dto.permissionNames?.filter(Boolean) ?? [];

    if (permissionIds.length === 0 && permissionNames.length === 0) {
      role.permissions = [];
      await this.roleRepo.save(role);
      return this.findOneWithPermissions(roleId);
    }

    const permissions = await this.resolvePermissions(
      permissionIds,
      permissionNames,
    );

    role.permissions = permissions;
    await this.roleRepo.save(role);

    return this.findOneWithPermissions(roleId);
  }

  /**
   * Add a single permission to a role (without overwriting others)
   */
  async addPermission(roleId: string, permissionName: string): Promise<Role> {
    const role = await this.roleRepo.findOne({
      where: { id: roleId },
      relations: ['permissions'],
    });
    if (!role) {
      throw new NotFoundException(`Role with id '${roleId}' not found`);
    }

    const perm = await this.permissionRepo.findOne({
      where: { name: permissionName },
    });
    if (!perm) {
      throw new NotFoundException(`Permission '${permissionName}' not found`);
    }

    const alreadyHas = role.permissions?.some((p) => p.id === perm.id);
    if (!alreadyHas) {
      role.permissions = [...(role.permissions || []), perm];
    }

    return this.roleRepo.save(role);
  }

  /*
   * Remove a single permission from a role
   */
  async removePermission(
    roleId: string,
    permissionName: string,
  ): Promise<Role> {
    const role = await this.roleRepo.findOne({
      where: { id: roleId },
      relations: ['permissions'],
    });
    if (!role) {
      throw new NotFoundException(`Role with id '${roleId}' not found`);
    }

    const perm = await this.permissionRepo.findOne({
      where: { name: permissionName },
    });
    if (!perm) {
      throw new NotFoundException(`Permission '${permissionName}' not found`);
    }

    role.permissions = role.permissions?.filter((p) => p.id !== perm.id) || [];

    return this.roleRepo.save(role);
  }

  private async resolvePermissions(
    permissionIds: string[],
    permissionNames: string[],
  ): Promise<Permission[]> {
    // Prefer matching by names first (aligns with frontend constants), otherwise fall back to IDs.
    if (permissionNames && permissionNames.length > 0) {
      const permissions = await this.permissionRepo.find({
        where: { name: In(permissionNames) },
      });
      if (permissions.length !== permissionNames.length) {
        const foundNames = permissions.map((p) => p.name);
        const missing = permissionNames.filter(
          (name) => !foundNames.includes(name),
        );
        throw new BadRequestException(
          `Unknown permission(s): ${missing.join(', ')}`,
        );
      }
      return permissions;
    }

    if (permissionIds && permissionIds.length > 0) {
      const permissions = await this.permissionRepo.find({
        where: { id: In(permissionIds) },
      });
      if (permissions.length !== permissionIds.length) {
        const foundIds = permissions.map((p) => p.id);
        const missing = permissionIds.filter((id) => !foundIds.includes(id));
        throw new BadRequestException(
          `Unknown permission id(s): ${missing.join(', ')}`,
        );
      }
      return permissions;
    }

    return [];
  }
}

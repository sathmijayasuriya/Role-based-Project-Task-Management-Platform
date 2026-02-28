import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from './entities/permission.entity';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
  ) {}

  async createPermission(dto: CreatePermissionDto): Promise<Permission> {
    const exists = await this.permissionRepo.findOne({
      where: { name: dto.name },
    });
    if (exists) {
      throw new ConflictException(`Permission '${dto.name}' already exists`);
    }

    const perm = this.permissionRepo.create({
      name: dto.name,
      description: dto.description,
    });

    return this.permissionRepo.save(perm);
  }
  async updatePermission(
    id: string,
    dto: UpdatePermissionDto,
  ): Promise<Permission> {
    // Find the existing permission
    const perm = await this.permissionRepo.findOne({ where: { id } });
    if (!perm) {
      throw new NotFoundException(`Permission with id '${id}' not found`);
    }

    // Merge updates
    Object.assign(perm, dto);

    // Save updated permission
    return this.permissionRepo.save(perm);
  }

  async findAll(): Promise<Permission[]> {
    return this.permissionRepo.find({
      relations: ['roles'],
      order: { name: 'ASC' },
    });
  }

  async findById(id: string): Promise<Permission> {
    const perm = await this.permissionRepo.findOne({ where: { id } });
    if (!perm) {
      throw new NotFoundException(`Permission with id '${id}' not found`);
    }
    return perm;
  }

  async findByName(name: string): Promise<Permission> {
    const perm = await this.permissionRepo.findOne({ where: { name } });
    if (!perm) {
      throw new NotFoundException(`Permission '${name}' not found`);
    }
    return perm;
  }

  async deletePermission(id: string): Promise<{ success: boolean }> {
    const perm = await this.permissionRepo.findOne({ where: { id } });
    if (!perm) {
      throw new NotFoundException(`Permission with id '${id}' not found`);
    }

    await this.permissionRepo.remove(perm);
    return { success: true };
  }

  /**
   * Handy helper for seeding multiple permissions at once
   */
  async ensurePermissions(permissionNames: string[]): Promise<void> {
    const existing = await this.permissionRepo.find();
    const existingNames = new Set(existing.map((p) => p.name));

    const toCreate = permissionNames.filter((name) => !existingNames.has(name));

    if (toCreate.length === 0) return;

    const perms = toCreate.map((name) => this.permissionRepo.create({ name }));
    await this.permissionRepo.save(perms);
  }
}

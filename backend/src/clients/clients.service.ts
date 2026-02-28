import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermissionName } from 'src/auth/constants/permissions.constants';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { Client } from './entities/client.entity';

interface JwtUser {
  userId: string;
  permissions: string[];
}

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
  ) {}

  private hasPerm(user: JwtUser, perm: PermissionName): boolean {
    return user.permissions?.includes(perm);
  }

  async create(dto: CreateClientDto, currentUser: JwtUser) {
    if (!this.hasPerm(currentUser, PermissionName.MANAGE_PROJECTS)) {
      throw new BadRequestException('You are not allowed to create clients');
    }

    const existing = await this.clientRepo.findOne({
      where: { name: dto.name },
    });
    if (existing) {
      throw new BadRequestException('Client name already exists');
    }

    const client = this.clientRepo.create({
      ...dto,
      is_active: dto.is_active ?? true,
    });

    return this.clientRepo.save(client);
  }

  findAll() {
    return this.clientRepo.find({
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string) {
    const client = await this.clientRepo.findOne({ where: { id } });
    if (!client) {
      throw new NotFoundException('Client not found');
    }
    return client;
  }

  async update(id: string, dto: UpdateClientDto, currentUser: JwtUser) {
    if (!this.hasPerm(currentUser, PermissionName.MANAGE_PROJECTS)) {
      throw new BadRequestException('You are not allowed to edit clients');
    }

    const client = await this.clientRepo.findOne({ where: { id } });
    if (!client) {
      throw new NotFoundException('Client not found');
    }

    if (dto.name && dto.name !== client.name) {
      const duplicate = await this.clientRepo.findOne({
        where: { name: dto.name },
      });
      if (duplicate) {
        throw new BadRequestException('Client name already exists');
      }
    }

    await this.clientRepo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string, currentUser: JwtUser) {
    if (!this.hasPerm(currentUser, PermissionName.MANAGE_PROJECTS)) {
      throw new BadRequestException('You are not allowed to delete clients');
    }

    const client = await this.clientRepo.findOne({ where: { id } });
    if (!client) {
      throw new NotFoundException('Client not found');
    }

    await this.clientRepo.delete(id);
    return { success: true };
  }
}

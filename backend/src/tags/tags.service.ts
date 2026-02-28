import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermissionName } from 'src/auth/constants/permissions.constants';
import { CreateTagDto } from './dto/create-tag.dto';
import { Tag } from './entities/tag.entity';

interface JwtUser {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
}

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private readonly tagRepo: Repository<Tag>,
  ) {}

  private hasPerm(user: JwtUser, perm: PermissionName): boolean {
    return user.permissions?.includes(perm);
  }

  async create(dto: CreateTagDto, currentUser: JwtUser) {
    if (!this.hasPerm(currentUser, PermissionName.MANAGE_TASKS)) {
      throw new ForbiddenException('You cannot manage tags');
    }

    const existing = await this.tagRepo.findOne({
      where: { name: dto.name },
    });
    if (existing) {
      throw new BadRequestException('Tag name already exists');
    }

    const tag = this.tagRepo.create({
      name: dto.name,
      color: dto.color,
    });

    return this.tagRepo.save(tag);
  }

  findAll() {
    return this.tagRepo.find({
      order: { name: 'ASC' },
    });
  }
}

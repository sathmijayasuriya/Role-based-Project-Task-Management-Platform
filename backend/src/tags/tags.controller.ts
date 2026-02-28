import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { PermissionName } from 'src/auth/constants/permissions.constants';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';

@Controller('tags')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post()
  @Permissions(PermissionName.MANAGE_TASKS)
  create(@Body() dto: CreateTagDto, @Req() req) {
    return this.tagsService.create(dto, req.user);
  }

  @Get()
  findAll() {
    return this.tagsService.findAll();
  }
}

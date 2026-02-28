import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { PermissionName } from 'src/auth/constants/permissions.constants';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Controller('clients')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @Permissions(PermissionName.MANAGE_PROJECTS)
  create(@Body() dto: CreateClientDto, @Req() req) {
    return this.clientsService.create(dto, req.user);
  }

  @Get()
  @Permissions(PermissionName.MANAGE_PROJECTS, PermissionName.PROJECT_VIEW_ALL)
  findAll() {
    return this.clientsService.findAll();
  }

  @Get(':id')
  @Permissions(PermissionName.MANAGE_PROJECTS, PermissionName.PROJECT_VIEW_ALL)
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.clientsService.findOne(id);
  }

  @Patch(':id')
  @Permissions(PermissionName.MANAGE_PROJECTS)
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateClientDto,
    @Req() req,
  ) {
    return this.clientsService.update(id, dto, req.user);
  }

  @Delete(':id')
  @Permissions(PermissionName.MANAGE_PROJECTS)
  remove(@Param('id', new ParseUUIDPipe()) id: string, @Req() req) {
    return this.clientsService.remove(id, req.user);
  }
}

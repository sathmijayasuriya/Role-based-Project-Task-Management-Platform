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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PermissionName } from 'src/auth/constants/permissions.constants';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Controller('tasks')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @Permissions(PermissionName.TASK_CREATE)
  create(@Body() dto: CreateTaskDto, @Req() req) {
    return this.tasksService.create(dto, req.user);
  }

  @Get()
  @Permissions(PermissionName.TASK_VIEW_ALL, PermissionName.TASK_VIEW_ASSIGNED)
  findAll(@Req() req) {
    return this.tasksService.findAllForUser(req.user);
  }

  @Get(':id')
  @Permissions(PermissionName.TASK_VIEW_ALL, PermissionName.TASK_VIEW_ASSIGNED)
  findOne(@Param('id', new ParseUUIDPipe()) id: string, @Req() req) {
    return this.tasksService.findOneForUser(id, req.user);
  }

  @Patch(':id')
  @Permissions(PermissionName.TASK_EDIT_ALL, PermissionName.TASK_EDIT_ASSIGNED)
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTaskDto,
    @Req() req,
  ) {
    return this.tasksService.updateForUser(id, dto, req.user);
  }

  @Delete(':id')
  @Permissions(PermissionName.TASK_DELETE)
  remove(@Param('id', new ParseUUIDPipe()) id: string, @Req() req) {
    return this.tasksService.removeForUser(id, req.user);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { PermissionName } from 'src/auth/constants/permissions.constants';
import { TaskTagsService } from './task-tags.service';
import { AddTaskTagDto } from './dto/add-task-tag.dto';

@Controller('tasks/:taskId/tags')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TaskTagsController {
  constructor(private readonly taskTagsService: TaskTagsService) {}

  @Post()
  @Permissions(PermissionName.TASK_EDIT_ALL, PermissionName.TASK_EDIT_ASSIGNED)
  add(
    @Param('taskId', new ParseUUIDPipe()) taskId: string,
    @Body() dto: AddTaskTagDto,
    @Req() req,
  ) {
    return this.taskTagsService.addTag(taskId, dto, req.user);
  }

  @Delete(':tagId')
  @Permissions(PermissionName.TASK_EDIT_ALL, PermissionName.TASK_EDIT_ASSIGNED)
  remove(
    @Param('taskId', new ParseUUIDPipe()) taskId: string,
    @Param('tagId', new ParseUUIDPipe()) tagId: string,
    @Req() req,
  ) {
    return this.taskTagsService.removeTag(taskId, tagId, req.user);
  }

  @Get()
  @Permissions(PermissionName.TASK_VIEW_ALL, PermissionName.TASK_VIEW_ASSIGNED)
  list(@Param('taskId', new ParseUUIDPipe()) taskId: string, @Req() req) {
    return this.taskTagsService.listForTask(taskId, req.user);
  }
}

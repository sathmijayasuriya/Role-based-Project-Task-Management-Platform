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
import { SubtasksService } from './subtasks.service';
import { CreateSubtaskDto } from './dto/create-subtask.dto';
import { UpdateSubtaskDto } from './dto/update-subtask.dto';

@Controller('tasks/:taskId/subtasks')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SubtasksController {
  constructor(private readonly subtasksService: SubtasksService) {}

  @Post()
  @Permissions(PermissionName.SUBTASK_CREATE)
  create(
    @Param('taskId', new ParseUUIDPipe()) taskId: string,
    @Body() dto: CreateSubtaskDto,
    @Req() req,
  ) {
    return this.subtasksService.create(taskId, dto, req.user);
  }

  @Get()
  @Permissions(
    PermissionName.SUBTASK_VIEW_ALL,
    PermissionName.SUBTASK_VIEW_ASSIGNED,
  )
  findForTask(
    @Param('taskId', new ParseUUIDPipe()) taskId: string,
    @Req() req,
  ) {
    return this.subtasksService.findForTask(taskId, req.user);
  }

  @Patch(':id')
  @Permissions(
    PermissionName.SUBTASK_EDIT_ALL,
    PermissionName.SUBTASK_EDIT_ASSIGNED,
  )
  update(
    @Param('taskId', new ParseUUIDPipe()) taskId: string,
    @Param('id', new ParseUUIDPipe()) subtaskId: string,
    @Body() dto: UpdateSubtaskDto,
    @Req() req,
  ) {
    return this.subtasksService.update(taskId, subtaskId, dto, req.user);
  }

  @Delete(':id')
  @Permissions(PermissionName.SUBTASK_DELETE)
  remove(
    @Param('taskId', new ParseUUIDPipe()) taskId: string,
    @Param('id', new ParseUUIDPipe()) subtaskId: string,
    @Req() req,
  ) {
    return this.subtasksService.remove(taskId, subtaskId, req.user);
  }
}

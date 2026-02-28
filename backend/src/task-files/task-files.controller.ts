import {
  Body,
  Controller,
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
import { TaskFilesService } from './task-files.service';
import { CreateTaskFileDto } from './dto/create-task-file.dto';

@Controller('tasks/:taskId/files')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TaskFilesController {
  constructor(private readonly filesService: TaskFilesService) {}

  @Post()
  @Permissions(PermissionName.TASK_EDIT_ALL, PermissionName.TASK_EDIT_ASSIGNED)
  add(
    @Param('taskId', new ParseUUIDPipe()) taskId: string,
    @Body() dto: CreateTaskFileDto,
    @Req() req,
  ) {
    return this.filesService.addFile(taskId, dto, req.user);
  }

  @Get()
  @Permissions(PermissionName.TASK_VIEW_ALL, PermissionName.TASK_VIEW_ASSIGNED)
  list(@Param('taskId', new ParseUUIDPipe()) taskId: string, @Req() req) {
    return this.filesService.findForTask(taskId, req.user);
  }
}

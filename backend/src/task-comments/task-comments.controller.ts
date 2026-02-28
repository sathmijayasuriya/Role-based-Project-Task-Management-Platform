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
import { TaskCommentsService } from './task-comments.service';
import { CreateTaskCommentDto } from './dto/create-task-comment.dto';

@Controller('tasks/:taskId/comments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TaskCommentsController {
  constructor(private readonly commentsService: TaskCommentsService) {}

  @Post()
  @Permissions(PermissionName.TASK_VIEW_ALL, PermissionName.TASK_VIEW_ASSIGNED)
  add(
    @Param('taskId', new ParseUUIDPipe()) taskId: string,
    @Body() dto: CreateTaskCommentDto,
    @Req() req,
  ) {
    return this.commentsService.addComment(taskId, dto, req.user);
  }

  @Get()
  @Permissions(PermissionName.TASK_VIEW_ALL, PermissionName.TASK_VIEW_ASSIGNED)
  list(@Param('taskId', new ParseUUIDPipe()) taskId: string, @Req() req) {
    return this.commentsService.findForTask(taskId, req.user);
  }
}

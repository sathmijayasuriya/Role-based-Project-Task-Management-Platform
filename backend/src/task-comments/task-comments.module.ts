import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from 'src/tasks/entities/task.entity';
import { ProjectMember } from 'src/project-members/entities/project-member.entity';
import { TaskComment } from './entities/task-comment.entity';
import { TaskCommentsService } from './task-comments.service';
import { TaskCommentsController } from './task-comments.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TaskComment, Task, ProjectMember])],
  controllers: [TaskCommentsController],
  providers: [TaskCommentsService],
  exports: [TaskCommentsService],
})
export class TaskCommentsModule {}

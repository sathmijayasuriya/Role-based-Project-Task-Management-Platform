import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from 'src/tasks/entities/task.entity';
import { Tag } from 'src/tags/entities/tag.entity';
import { ProjectMember } from 'src/project-members/entities/project-member.entity';
import { TaskTag } from './entities/task-tag.entity';
import { TaskTagsService } from './task-tags.service';
import { TaskTagsController } from './task-tags.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TaskTag, Task, Tag, ProjectMember])],
  controllers: [TaskTagsController],
  providers: [TaskTagsService],
  exports: [TaskTagsService],
})
export class TaskTagsModule {}

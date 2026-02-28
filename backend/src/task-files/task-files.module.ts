import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from 'src/tasks/entities/task.entity';
import { ProjectMember } from 'src/project-members/entities/project-member.entity';
import { TaskFile } from './entities/task-file.entity';
import { TaskFilesService } from './task-files.service';
import { TaskFilesController } from './task-files.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TaskFile, Task, ProjectMember])],
  controllers: [TaskFilesController],
  providers: [TaskFilesService],
  exports: [TaskFilesService],
})
export class TaskFilesModule {}

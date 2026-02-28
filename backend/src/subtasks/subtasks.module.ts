import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from 'src/tasks/entities/task.entity';
import { ProjectMember } from 'src/project-members/entities/project-member.entity';
import { Subtask } from './entities/subtask.entity';
import { SubtasksService } from './subtasks.service';
import { SubtasksController } from './subtasks.controller';
import { ActivityLogsModule } from 'src/activity-logs/activity-logs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subtask, Task, ProjectMember]),
    ActivityLogsModule,
  ],
  controllers: [SubtasksController],
  providers: [SubtasksService],
  exports: [SubtasksService],
})
export class SubtasksModule {}

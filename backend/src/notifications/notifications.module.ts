import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { Notification } from './entities/notification.entity';
import { Task } from '../tasks/entities/task.entity';
import { Subtask } from '../subtasks/entities/subtask.entity';
import { Project } from '../projects/entities/project.entity';
import { ProjectMember } from '../project-members/entities/project-member.entity';
import { User } from '../users/entities/user.entity';
import { AdminNotificationsController } from './admin-notifications.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      User,
      Project,
      Task,
      Subtask,
      ProjectMember,
    ]),
  ],
  controllers: [NotificationsController, AdminNotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}

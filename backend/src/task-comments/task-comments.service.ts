import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermissionName } from 'src/auth/constants/permissions.constants';
import { Task } from 'src/tasks/entities/task.entity';
import { ProjectMember } from 'src/project-members/entities/project-member.entity';
import { TaskComment } from './entities/task-comment.entity';
import { CreateTaskCommentDto } from './dto/create-task-comment.dto';

interface JwtUser {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
}

@Injectable()
export class TaskCommentsService {
  constructor(
    @InjectRepository(TaskComment)
    private readonly commentRepo: Repository<TaskComment>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepo: Repository<ProjectMember>,
  ) {}

  private hasPerm(user: JwtUser, perm: PermissionName): boolean {
    return user.permissions?.includes(perm);
  }

  private async isUserAssignedToTask(
    taskId: string,
    userId: string,
  ): Promise<boolean> {
    const task = await this.taskRepo.findOne({
      where: { id: taskId, is_deleted: false },
      select: ['id', 'assigned_to', 'created_by', 'project_id'],
    });

    if (!task) return false;

    if (task.assigned_to === userId || task.created_by === userId) {
      return true;
    }

    if (task.project_id) {
      const memberCount = await this.projectMemberRepo.count({
        where: { project_id: task.project_id, user_id: userId },
      });

      return memberCount > 0;
    }

    return false;
  }

  private async assertTaskAccessible(taskId: string) {
    const exists = await this.taskRepo.findOne({
      where: { id: taskId, is_deleted: false },
      select: ['id'],
    });
    if (!exists) {
      throw new NotFoundException('Task not found');
    }
  }

  async addComment(
    taskId: string,
    dto: CreateTaskCommentDto,
    currentUser: JwtUser,
  ) {
    await this.assertTaskAccessible(taskId);

    const canViewAll = this.hasPerm(currentUser, PermissionName.TASK_VIEW_ALL);
    const canViewAssigned = this.hasPerm(
      currentUser,
      PermissionName.TASK_VIEW_ASSIGNED,
    );

    if (!canViewAll && !canViewAssigned) {
      throw new ForbiddenException('You cannot comment on tasks');
    }

    if (!canViewAll) {
      const assigned = await this.isUserAssignedToTask(
        taskId,
        currentUser.userId,
      );
      if (!assigned) {
        throw new ForbiddenException('You cannot comment on this task');
      }
    }

    const comment = this.commentRepo.create({
      task_id: taskId,
      body: dto.body,
      author_id: currentUser.userId,
      updated_at: null,
    });

    return this.commentRepo.save(comment);
  }

  async findForTask(taskId: string, currentUser: JwtUser) {
    await this.assertTaskAccessible(taskId);

    const canViewAll = this.hasPerm(currentUser, PermissionName.TASK_VIEW_ALL);
    const canViewAssigned = this.hasPerm(
      currentUser,
      PermissionName.TASK_VIEW_ASSIGNED,
    );

    if (!canViewAll && !canViewAssigned) {
      throw new ForbiddenException('You cannot view comments');
    }

    if (!canViewAll) {
      const assigned = await this.isUserAssignedToTask(
        taskId,
        currentUser.userId,
      );
      if (!assigned) {
        throw new ForbiddenException('You cannot view these comments');
      }
    }

    return this.commentRepo.find({
      where: { task_id: taskId, is_deleted: false },
      order: { created_at: 'DESC' },
    });
  }
}

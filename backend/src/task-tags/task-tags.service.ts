import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermissionName } from 'src/auth/constants/permissions.constants';
import { Task } from 'src/tasks/entities/task.entity';
import { Tag } from 'src/tags/entities/tag.entity';
import { ProjectMember } from 'src/project-members/entities/project-member.entity';
import { TaskTag } from './entities/task-tag.entity';
import { AddTaskTagDto } from './dto/add-task-tag.dto';

interface JwtUser {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
}

@Injectable()
export class TaskTagsService {
  constructor(
    @InjectRepository(TaskTag)
    private readonly taskTagRepo: Repository<TaskTag>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(Tag)
    private readonly tagRepo: Repository<Tag>,
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

  private async assertTaskExists(taskId: string) {
    const task = await this.taskRepo.findOne({
      where: { id: taskId, is_deleted: false },
      select: ['id'],
    });
    if (!task) throw new NotFoundException('Task not found');
  }

  async addTag(taskId: string, dto: AddTaskTagDto, currentUser: JwtUser) {
    const canEditAll = this.hasPerm(currentUser, PermissionName.TASK_EDIT_ALL);
    const canEditAssigned = this.hasPerm(
      currentUser,
      PermissionName.TASK_EDIT_ASSIGNED,
    );

    if (!canEditAll && !canEditAssigned) {
      throw new ForbiddenException('You cannot tag tasks');
    }

    await this.assertTaskExists(taskId);

    if (!canEditAll) {
      const assigned = await this.isUserAssignedToTask(
        taskId,
        currentUser.userId,
      );
      if (!assigned) {
        throw new ForbiddenException('You cannot tag this task');
      }
    }

    const tag = await this.tagRepo.findOne({
      where: { id: dto.tagId },
      select: ['id'],
    });
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    const existing = await this.taskTagRepo.findOne({
      where: { task_id: taskId, tag_id: dto.tagId },
    });
    if (existing) {
      throw new ConflictException('Task already has this tag');
    }

    const record = this.taskTagRepo.create({
      task_id: taskId,
      tag_id: dto.tagId,
    });

    return this.taskTagRepo.save(record);
  }

  async removeTag(
    taskId: string,
    tagId: string,
    currentUser: JwtUser,
  ): Promise<{ success: boolean }> {
    const canEditAll = this.hasPerm(currentUser, PermissionName.TASK_EDIT_ALL);
    const canEditAssigned = this.hasPerm(
      currentUser,
      PermissionName.TASK_EDIT_ASSIGNED,
    );

    if (!canEditAll && !canEditAssigned) {
      throw new ForbiddenException('You cannot edit task tags');
    }

    await this.assertTaskExists(taskId);

    if (!canEditAll) {
      const assigned = await this.isUserAssignedToTask(
        taskId,
        currentUser.userId,
      );
      if (!assigned) {
        throw new ForbiddenException('You cannot edit this task');
      }
    }

    await this.taskTagRepo.delete({
      task_id: taskId,
      tag_id: tagId,
    });

    return { success: true };
  }

  async listForTask(taskId: string, currentUser: JwtUser) {
    await this.assertTaskExists(taskId);

    const canViewAll = this.hasPerm(currentUser, PermissionName.TASK_VIEW_ALL);
    const canViewAssigned = this.hasPerm(
      currentUser,
      PermissionName.TASK_VIEW_ASSIGNED,
    );

    if (!canViewAll && !canViewAssigned) {
      throw new ForbiddenException('You cannot view task tags');
    }

    if (!canViewAll) {
      const assigned = await this.isUserAssignedToTask(
        taskId,
        currentUser.userId,
      );
      if (!assigned) {
        throw new ForbiddenException('You cannot view this task');
      }
    }

    return this.taskTagRepo.find({
      where: { task_id: taskId },
      relations: ['tag'],
      order: { created_at: 'DESC' },
    });
  }
}

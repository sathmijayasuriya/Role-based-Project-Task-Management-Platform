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
import { Subtask } from './entities/subtask.entity';
import { CreateSubtaskDto } from './dto/create-subtask.dto';
import { UpdateSubtaskDto } from './dto/update-subtask.dto';
import { ActivityLogsService } from 'src/activity-logs/activity-logs.service';

interface JwtUser {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
}

@Injectable()
export class SubtasksService {
  constructor(
    @InjectRepository(Subtask)
    private readonly subtaskRepo: Repository<Subtask>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepo: Repository<ProjectMember>,
    private readonly activityLogs: ActivityLogsService,
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

    if (!task) {
      return false;
    }

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

    if (!task) {
      throw new NotFoundException('Task not found');
    }
  }

  async create(taskId: string, dto: CreateSubtaskDto, currentUser: JwtUser) {
    if (!this.hasPerm(currentUser, PermissionName.SUBTASK_CREATE)) {
      throw new ForbiddenException('You cannot create subtasks');
    }

    await this.assertTaskExists(taskId);

    const hasGlobalAccess =
      this.hasPerm(currentUser, PermissionName.SUBTASK_VIEW_ALL) ||
      this.hasPerm(currentUser, PermissionName.TASK_VIEW_ALL) ||
      this.hasPerm(currentUser, PermissionName.SUBTASK_EDIT_ALL);

    if (!hasGlobalAccess) {
      const assigned = await this.isUserAssignedToTask(
        taskId,
        currentUser.userId,
      );
      if (!assigned) {
        throw new ForbiddenException('You cannot create subtasks here');
      }
    }

    const subtask = this.subtaskRepo.create({
      task_id: taskId,
      title: dto.title,
      description: dto.description,
      assigned_to: dto.assigneeId,
      status: dto.status ?? 'todo',
      due_date: dto.dueDate ?? null,
      created_by: currentUser.userId,
      updated_by: currentUser.userId,
    });

    return this.subtaskRepo.save(subtask);
  }

  async findForTask(taskId: string, currentUser: JwtUser) {
    await this.assertTaskExists(taskId);

    const canViewAll = this.hasPerm(
      currentUser,
      PermissionName.SUBTASK_VIEW_ALL,
    );
    const canViewAssigned = this.hasPerm(
      currentUser,
      PermissionName.SUBTASK_VIEW_ASSIGNED,
    );

    if (!canViewAll && !canViewAssigned) {
      throw new ForbiddenException('You cannot view subtasks');
    }

    if (canViewAll) {
      return this.subtaskRepo.find({
        where: { task_id: taskId, is_deleted: false },
        order: { created_at: 'DESC' },
      });
    }

    const assigned = await this.isUserAssignedToTask(
      taskId,
      currentUser.userId,
    );
    if (!assigned) {
      throw new ForbiddenException('You cannot view these subtasks');
    }

    return this.subtaskRepo.find({
      where: { task_id: taskId, is_deleted: false },
      order: { created_at: 'DESC' },
    });
  }

  async update(
    taskId: string,
    subtaskId: string,
    dto: UpdateSubtaskDto,
    currentUser: JwtUser,
  ) {
    const canEditAll = this.hasPerm(
      currentUser,
      PermissionName.SUBTASK_EDIT_ALL,
    );
    const canEditAssigned = this.hasPerm(
      currentUser,
      PermissionName.SUBTASK_EDIT_ASSIGNED,
    );

    if (!canEditAll && !canEditAssigned) {
      throw new ForbiddenException('You cannot edit subtasks');
    }

    await this.assertTaskExists(taskId);

    const subtask = await this.subtaskRepo.findOne({
      where: { id: subtaskId, task_id: taskId, is_deleted: false },
    });

    if (!subtask) {
      throw new NotFoundException('Subtask not found');
    }
    const before = { ...subtask };

    if (!canEditAll) {
      const assigned = await this.isUserAssignedToTask(
        taskId,
        currentUser.userId,
      );
      if (!assigned) {
        throw new ForbiddenException('You cannot edit this subtask');
      }
    }

    const updatePayload: Partial<Subtask> = {
      updated_by: currentUser.userId,
      updated_at: new Date(),
    };

    if (dto.title !== undefined) updatePayload.title = dto.title;
    if (dto.description !== undefined)
      updatePayload.description = dto.description;
    if (dto.assigneeId !== undefined)
      updatePayload.assigned_to = dto.assigneeId;
    if (dto.status !== undefined) updatePayload.status = dto.status;
    if (dto.dueDate !== undefined) updatePayload.due_date = dto.dueDate;

    await this.subtaskRepo.update(subtaskId, updatePayload);

    const updated = await this.subtaskRepo.findOne({
      where: { id: subtaskId, task_id: taskId },
    });

    await this.activityLogs.logEntityChange({
      entityType: 'subtask',
      entityId: subtaskId,
      action: 'UPDATE',
      before,
      after: updated,
      meta: {
        updatedFields: Object.keys(updatePayload),
      },
    });

    return updated;
  }

  async remove(taskId: string, subtaskId: string, currentUser: JwtUser) {
    if (!this.hasPerm(currentUser, PermissionName.SUBTASK_DELETE)) {
      throw new ForbiddenException('You cannot delete subtasks');
    }

    await this.assertTaskExists(taskId);

    const subtask = await this.subtaskRepo.findOne({
      where: { id: subtaskId, task_id: taskId, is_deleted: false },
    });

    if (!subtask) {
      throw new NotFoundException('Subtask not found');
    }

    const deletePayload = {
      is_deleted: true,
      deleted_at: new Date(),
      updated_by: currentUser.userId,
      updated_at: new Date(),
    };

    await this.subtaskRepo.update(subtaskId, deletePayload);

    await this.activityLogs.logEntityChange({
      entityType: 'subtask',
      entityId: subtaskId,
      action: 'DELETE',
      before: subtask,
      after: { ...subtask, ...deletePayload },
    });

    return { success: true };
  }
}

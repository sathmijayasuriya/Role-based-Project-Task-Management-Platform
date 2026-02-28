import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { PermissionName } from 'src/auth/constants/permissions.constants';
import { Task } from './entities/task.entity';
import { Project } from 'src/projects/entities/project.entity';
import { ProjectMember } from 'src/project-members/entities/project-member.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import type { TaskStatus } from './constants/task.constants';
import { ActivityLogsService } from 'src/activity-logs/activity-logs.service';

interface JwtUser {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
}

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepo: Repository<ProjectMember>,
    private readonly activityLogs: ActivityLogsService,
  ) {}

  // -------- helpers --------

  private hasPerm(user: JwtUser, perm: PermissionName): boolean {
    return user.permissions?.includes(perm);
  }

  private statusToProgress(status: TaskStatus): number {
    switch (status) {
      case 'completed':
        return 100;
      case 'in_progress':
      case 'review':
        return 50;
      default:
        return 0;
    }
  }

  private async isUserAssignedToProject(
    projectId: string,
    userId: string,
  ): Promise<boolean> {
    const membershipCount = await this.projectMemberRepo.count({
      where: { project_id: projectId, user_id: userId },
    });

    if (membershipCount > 0) return true;

    const project = await this.projectRepo.findOne({
      where: { id: projectId, is_deleted: false },
      select: ['id', 'created_by'],
    });

    return project ? project.created_by === userId : false;
  }

  private async isUserAssignedToTask(
    task: Task,
    user: JwtUser,
  ): Promise<boolean> {
    if (!task) return false;

    if (task.assigned_to === user.userId) return true;
    if (task.created_by === user.userId) return true;

    if (task.project_id) {
      return this.isUserAssignedToProject(task.project_id, user.userId);
    }

    return false;
  }

  // -------- CRUD operations --------

  async create(dto: CreateTaskDto, currentUser: JwtUser) {
    if (!this.hasPerm(currentUser, PermissionName.TASK_CREATE)) {
      throw new ForbiddenException('You cannot create tasks');
    }

    const project = await this.projectRepo.findOne({
      where: { id: dto.projectId, is_deleted: false },
      select: ['id'],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const status = dto.status ?? 'todo';

    const task = this.taskRepo.create({
      title: dto.title,
      description: dto.description,
      project_id: dto.projectId,
      assigned_to: dto.assigneeId,
      status,
      priority: dto.priority ?? 'medium',
      due_date: dto.dueDate ?? null,
      estimated_hours: dto.estimatedHours ?? null,
      actual_hours: dto.actualHours ?? null,
      story_points: dto.storyPoints ?? null,
      position: dto.position ?? null,
      progress_percent: this.statusToProgress(status),
      created_by: currentUser.userId,
      updated_by: currentUser.userId,
    });

    return this.taskRepo.save(task);
  }

  async findAllForUser(currentUser: JwtUser) {
    const canViewAll = this.hasPerm(currentUser, PermissionName.TASK_VIEW_ALL);
    const canViewAssigned = this.hasPerm(
      currentUser,
      PermissionName.TASK_VIEW_ASSIGNED,
    );

    if (!canViewAll && !canViewAssigned) {
      throw new ForbiddenException('You cannot view tasks');
    }

    if (canViewAll) {
      return this.taskRepo.find({
        where: { is_deleted: false },
        order: { created_at: 'DESC' },
      });
    }

    const projectMemberships = await this.projectMemberRepo.find({
      where: { user_id: currentUser.userId },
    });
    const memberProjectIds = projectMemberships.map((p) => p.project_id);

    const qb = this.taskRepo
      .createQueryBuilder('task')
      .where('task.is_deleted = false')
      .andWhere(
        new Brackets((qbWhere) => {
          qbWhere
            .where('task.assigned_to = :userId', { userId: currentUser.userId })
            .orWhere('task.created_by = :userId', {
              userId: currentUser.userId,
            });

          if (memberProjectIds.length > 0) {
            qbWhere.orWhere('task.project_id IN (:...memberProjectIds)', {
              memberProjectIds,
            });
          }
        }),
      )
      .orderBy('task.created_at', 'DESC');

    return qb.getMany();
  }

  async findOneForUser(id: string, currentUser: JwtUser) {
    const task = await this.taskRepo.findOne({
      where: { id, is_deleted: false },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const canViewAll = this.hasPerm(currentUser, PermissionName.TASK_VIEW_ALL);
    const canViewAssigned = this.hasPerm(
      currentUser,
      PermissionName.TASK_VIEW_ASSIGNED,
    );

    if (canViewAll) {
      return task;
    }

    if (canViewAssigned) {
      const assigned = await this.isUserAssignedToTask(task, currentUser);
      if (!assigned) {
        throw new ForbiddenException('You cannot view this task');
      }
      return task;
    }

    throw new ForbiddenException('You cannot view tasks');
  }

  async updateForUser(id: string, dto: UpdateTaskDto, currentUser: JwtUser) {
    const canEditAll = this.hasPerm(currentUser, PermissionName.TASK_EDIT_ALL);
    const canEditAssigned = this.hasPerm(
      currentUser,
      PermissionName.TASK_EDIT_ASSIGNED,
    );

    if (!canEditAll && !canEditAssigned) {
      throw new ForbiddenException('You cannot edit tasks');
    }

    const task = await this.taskRepo.findOne({
      where: { id, is_deleted: false },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }
    const before = { ...task };

    if (!canEditAll) {
      const canEdit = await this.isUserAssignedToTask(task, currentUser);
      if (!canEdit) {
        throw new ForbiddenException('You cannot edit this task');
      }
    }

    if (dto.projectId && dto.projectId !== task.project_id) {
      const project = await this.projectRepo.findOne({
        where: { id: dto.projectId, is_deleted: false },
        select: ['id'],
      });

      if (!project) {
        throw new NotFoundException('Project not found');
      }
    }

    const nextStatus = dto.status ?? task.status;

    const updatePayload: Partial<Task> = {
      updated_by: currentUser.userId,
      updated_at: new Date(),
    };

    if (dto.title !== undefined) updatePayload.title = dto.title;
    if (dto.description !== undefined)
      updatePayload.description = dto.description;
    if (dto.projectId !== undefined) updatePayload.project_id = dto.projectId;
    if (dto.assigneeId !== undefined)
      updatePayload.assigned_to = dto.assigneeId;
    if (dto.priority !== undefined) updatePayload.priority = dto.priority;
    if (dto.dueDate !== undefined) updatePayload.due_date = dto.dueDate;
    if (dto.estimatedHours !== undefined)
      updatePayload.estimated_hours = dto.estimatedHours;
    if (dto.actualHours !== undefined)
      updatePayload.actual_hours = dto.actualHours;
    if (dto.storyPoints !== undefined)
      updatePayload.story_points = dto.storyPoints;
    if (dto.position !== undefined) updatePayload.position = dto.position;
    if (dto.status !== undefined) updatePayload.status = nextStatus;

    // keep progress in sync with the resulting status
    updatePayload.progress_percent = this.statusToProgress(nextStatus);

    await this.taskRepo.update(id, updatePayload);

    const updated = await this.findOneForUser(id, currentUser);

    await this.activityLogs.logEntityChange({
      entityType: 'task',
      entityId: id,
      action: 'UPDATE',
      before,
      after: updated,
      meta: {
        updatedFields: Object.keys(updatePayload),
      },
    });

    return updated;
  }

  async removeForUser(id: string, currentUser: JwtUser) {
    if (!this.hasPerm(currentUser, PermissionName.TASK_DELETE)) {
      throw new ForbiddenException('You cannot delete tasks');
    }

    const task = await this.taskRepo.findOne({
      where: { id, is_deleted: false },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const deletePayload = {
      is_deleted: true,
      deleted_at: new Date(),
      updated_by: currentUser.userId,
      updated_at: new Date(),
    };

    await this.taskRepo.update(id, deletePayload);

    await this.activityLogs.logEntityChange({
      entityType: 'task',
      entityId: id,
      action: 'DELETE',
      before: task,
      after: { ...task, ...deletePayload },
    });

    return { success: true };
  }

  // -------- utilities --------

  async recalcTaskProgress(taskId: string): Promise<number> {
    const task = await this.taskRepo.findOne({
      where: { id: taskId, is_deleted: false },
      select: ['id', 'status'],
    });
    if (!task) return 0;

    const normalized = this.statusToProgress(task.status);

    await this.taskRepo.update(taskId, {
      progress_percent: normalized,
      updated_at: new Date(),
    });

    return normalized;
  }
}

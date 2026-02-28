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
import { TaskFile } from './entities/task-file.entity';
import { CreateTaskFileDto } from './dto/create-task-file.dto';

interface JwtUser {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
}

@Injectable()
export class TaskFilesService {
  constructor(
    @InjectRepository(TaskFile)
    private readonly fileRepo: Repository<TaskFile>,
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

  private async assertTask(taskId: string) {
    const exists = await this.taskRepo.findOne({
      where: { id: taskId, is_deleted: false },
      select: ['id'],
    });
    if (!exists) throw new NotFoundException('Task not found');
  }

  async addFile(taskId: string, dto: CreateTaskFileDto, currentUser: JwtUser) {
    const canEditAll = this.hasPerm(currentUser, PermissionName.TASK_EDIT_ALL);
    const canEditAssigned = this.hasPerm(
      currentUser,
      PermissionName.TASK_EDIT_ASSIGNED,
    );

    if (!canEditAll && !canEditAssigned) {
      throw new ForbiddenException('You cannot add files to tasks');
    }

    await this.assertTask(taskId);

    if (!canEditAll) {
      const assigned = await this.isUserAssignedToTask(
        taskId,
        currentUser.userId,
      );
      if (!assigned) {
        throw new ForbiddenException('You cannot add files to this task');
      }
    }

    const record = this.fileRepo.create({
      task_id: taskId,
      original_name: dto.originalName,
      storage_path: dto.storagePath,
      mime_type: dto.mimeType,
      size_bytes: dto.sizeBytes,
      uploaded_by: currentUser.userId,
    });

    return this.fileRepo.save(record);
  }

  async findForTask(taskId: string, currentUser: JwtUser) {
    await this.assertTask(taskId);

    const canViewAll = this.hasPerm(currentUser, PermissionName.TASK_VIEW_ALL);
    const canViewAssigned = this.hasPerm(
      currentUser,
      PermissionName.TASK_VIEW_ASSIGNED,
    );

    if (!canViewAll && !canViewAssigned) {
      throw new ForbiddenException('You cannot view task files');
    }

    if (!canViewAll) {
      const assigned = await this.isUserAssignedToTask(
        taskId,
        currentUser.userId,
      );
      if (!assigned) {
        throw new ForbiddenException('You cannot view these files');
      }
    }

    return this.fileRepo.find({
      where: { task_id: taskId },
      order: { uploaded_at: 'DESC' },
    });
  }
}

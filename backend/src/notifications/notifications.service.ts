import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observable, Subject } from 'rxjs';
import { Notification, NotificationType } from './entities/notification.entity';
import { GetNotificationsDto } from './dto/get-notifications.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { ActivityLog } from '../activity-logs/entities/activity-log.entity';
import { Task } from '../tasks/entities/task.entity';
import { Subtask } from '../subtasks/entities/subtask.entity';
import { Project } from '../projects/entities/project.entity';
import { ProjectMember } from '../project-members/entities/project-member.entity';
import { User } from '../users/entities/user.entity';

type JwtUser = {
  userId: string;
  email?: string;
  roles?: string[];
  permissions?: string[];
};

type CreateNotificationInput = {
  userId?: string | null;
  title: string;
  message: string;
  type?: NotificationType;
  entityType?: string | null;
  entityId?: string | null;
  meta?: Record<string, any> | null;
  audience?: 'user' | 'admin';
  activityLogId?: string | null;
  roleIds?: string[];
  roleNames?: string[];
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly userStreams = new Map<string, Subject<NotificationResponseDto>>();

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(Subtask)
    private readonly subtaskRepo: Repository<Subtask>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepo: Repository<ProjectMember>,
  ) {}

  // --------- Public API ---------

  async listForUser(
    user: JwtUser,
    query: GetNotificationsDto,
  ): Promise<{ items: NotificationResponseDto[]; meta: any }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 15;
    const includeRead = query.includeRead ?? true;

    const qb = this.notificationRepo
      .createQueryBuilder('notification')
      .where('notification.user_id = :userId', { userId: user.userId });

    if (!includeRead) {
      qb.andWhere('notification.is_read = false');
    }

    qb.orderBy('notification.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [items, total] = await qb.getManyAndCount();

    return {
      items: items.map(NotificationResponseDto.fromEntity),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async unreadCount(user: JwtUser): Promise<{ count: number }> {
    const count = await this.notificationRepo.count({
      where: { user_id: user.userId, is_read: false },
    });
    return { count };
  }

  async markAsRead(id: string, user: JwtUser): Promise<NotificationResponseDto> {
    const notification = await this.notificationRepo.findOne({ where: { id } });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (!this.canAccess(notification, user)) {
      throw new ForbiddenException('You cannot update this notification');
    }

    if (!notification.is_read) {
      await this.notificationRepo.update(id, {
        is_read: true,
        read_at: new Date(),
      });
    }

    const updated = await this.notificationRepo.findOne({ where: { id } });
    if (updated) {
      this.emit(updated);
      return NotificationResponseDto.fromEntity(updated);
    }

    throw new NotFoundException('Notification not found after update');
  }

  async markAllAsRead(user: JwtUser): Promise<{ success: boolean }> {
    await this.notificationRepo
      .createQueryBuilder()
      .update(Notification)
      .set({ is_read: true, read_at: () => 'CURRENT_TIMESTAMP' })
      .where('user_id = :userId', { userId: user.userId })
      .andWhere('is_read = false')
      .execute();

    return { success: true };
  }

  streamForUser(user: JwtUser): Observable<NotificationResponseDto> {
    return this.getUserStream(user.userId).asObservable();
  }

  // --------- Activity log integration ---------

  async handleActivityLog(log: ActivityLog): Promise<void> {
    try {
      const candidates = await this.buildNotificationsFromActivity(log);
      if (!candidates.length) return;

      for (const candidate of candidates) {
        await this.createNotification({
          ...candidate,
          activityLogId: log.id,
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to create notifications for activity log ${log.id}`,
        error?.stack ?? error,
      );
    }
  }

  async createForRoles(
    dto: CreateNotificationDto,
  ): Promise<{ created: number; targets: string[] }> {
    const roleIds = dto.roleIds ?? [];
    const roleNames = (dto.roleNames ?? []).map((r) => r.toLowerCase());

    if (!roleIds.length && !roleNames.length) {
      throw new BadRequestException('At least one role must be provided');
    }

    const targetUserIds = await this.getUserIdsForRoles(roleIds, roleNames);
    if (!targetUserIds.length) {
      return { created: 0, targets: [] };
    }

    const rolesMeta =
      (roleIds.length || roleNames.length) && {
        ids: roleIds.length ? roleIds : undefined,
        names: roleNames.length ? roleNames : undefined,
      };

    const inputs: CreateNotificationInput[] = targetUserIds.map((userId) => ({
      userId,
      audience: dto.audience ?? 'user',
      title: dto.title,
      message: dto.message,
      type: dto.type ?? 'info',
      entityType: dto.entityType ?? null,
      entityId: dto.entityId ?? null,
      meta: {
        source: 'admin_broadcast',
        ...(rolesMeta ? { roles: rolesMeta } : {}),
      },
    }));

    await this.createMany(inputs);
    return { created: inputs.length, targets: targetUserIds };
  }

  async createNotification(
    input: CreateNotificationInput,
  ): Promise<Notification[]> {
    if (input.audience === 'admin' && !input.userId) {
      const adminIds = await this.getAdminUserIds();
      if (!adminIds.length) return [];

      const results: Notification[] = [];
      for (const adminId of adminIds) {
        const created = await this.saveNotification({
          ...input,
          userId: adminId,
          audience: 'admin',
        });
        if (created) results.push(created);
      }
      return results;
    }

    const single = await this.saveNotification(input);
    return single ? [single] : [];
  }

  async createMany(inputs: CreateNotificationInput[]): Promise<void> {
    for (const input of inputs) {
      await this.createNotification(input);
    }
  }

  // --------- Internal helpers ---------

  private async saveNotification(
    input: CreateNotificationInput,
  ): Promise<Notification | null> {
    if (!input.userId) return null;

    const record = this.notificationRepo.create({
      user_id: input.userId,
      audience: input.audience ?? 'user',
      title: input.title,
      message: input.message,
      type: input.type ?? 'info',
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      meta: input.meta ?? null,
      activity_log_id: input.activityLogId ?? null,
    });

    const saved = await this.notificationRepo.save(record);
    this.emit(saved);
    return saved;
  }

  private emit(notification: Notification) {
    const dto = NotificationResponseDto.fromEntity(notification);
    const userId = notification.user_id;
    if (userId) {
      this.getUserStream(userId).next(dto);
    }
  }

  private getUserStream(userId: string): Subject<NotificationResponseDto> {
    const existing = this.userStreams.get(userId);
    if (existing) return existing;
    const subject = new Subject<NotificationResponseDto>();
    this.userStreams.set(userId, subject);
    return subject;
  }

  private async getUserIdsForRoles(
    roleIds: string[],
    roleNames: string[],
  ): Promise<string[]> {
    const qb = this.userRepo
      .createQueryBuilder('user')
      .leftJoin('user.roles', 'role')
      .where('user.is_deleted = false');

    if (roleIds?.length) {
      qb.andWhere('role.id IN (:...roleIds)', { roleIds });
    }

    if (roleNames?.length) {
      qb.andWhere('LOWER(role.name) IN (:...roleNames)', {
        roleNames: roleNames.map((r) => r.toLowerCase()),
      });
    }

    const rows = await qb.select('user.id', 'id').getRawMany();
    return Array.from(
      new Set(
        rows
          .map((r) => r.id as string | undefined)
          .filter((id): id is string => Boolean(id)),
      ),
    );
  }

  private canAccess(notification: Notification, user: JwtUser): boolean {
    if (!user?.userId) return false;
    if (notification.user_id === user.userId) return true;
    if (
      notification.audience === 'admin' &&
      this.isAdmin(user) &&
      notification.user_id
    ) {
      return notification.user_id === user.userId;
    }
    return false;
  }

  private isAdmin(user: JwtUser): boolean {
    return (
      user?.roles?.some((role) => role?.toLowerCase() === 'admin') ?? false
    );
  }

  private async getAdminUserIds(): Promise<string[]> {
    const rows = await this.userRepo
      .createQueryBuilder('user')
      .leftJoin('user.roles', 'role')
      .where('LOWER(role.name) = :admin', { admin: 'admin' })
      .andWhere('user.is_deleted = false')
      .select('user.id', 'id')
      .getRawMany();

    return rows
      .map((row) => (row.id ?? row.user_id ?? '').toString())
      .filter(Boolean);
  }

  private async getProjectMembers(projectId: string): Promise<string[]> {
    const members = await this.projectMemberRepo.find({
      where: { project_id: projectId },
    });
    return members.map((m) => m.user_id).filter(Boolean);
  }

  private async buildNotificationsFromActivity(
    log: ActivityLog,
  ): Promise<CreateNotificationInput[]> {
    const notifications: CreateNotificationInput[] = [];

    if (!log) return notifications;

    switch ((log.entity_type || '').toLowerCase()) {
      case 'task':
        notifications.push(...(await this.fromTaskActivity(log)));
        break;
      case 'subtask':
        notifications.push(...(await this.fromSubtaskActivity(log)));
        break;
      case 'project_member':
        notifications.push(...(await this.fromProjectMemberActivity(log)));
        break;
      case 'project':
        notifications.push(...(await this.fromProjectActivity(log)));
        break;
      case 'user':
        notifications.push(...(await this.fromUserActivity(log)));
        break;
      default:
        break;
    }

    return notifications;
  }

  private async fromTaskActivity(
    log: ActivityLog,
  ): Promise<CreateNotificationInput[]> {
    const notifications: CreateNotificationInput[] = [];
    const before = (log.before_data ?? {}) as Partial<Task> & Record<string, any>;
    const after = (log.after_data ?? {}) as Partial<Task> & Record<string, any>;

    const title = (after.title || before.title || 'Task').toString();
    const newAssignee =
      (after.assigned_to ?? after.assignedTo ?? null) as string | null;
    const prevAssignee =
      (before.assigned_to ?? before.assignedTo ?? null) as string | null;
    const actorId = log.user_id;

    if (log.action === 'CREATE' && newAssignee) {
      if (!actorId || actorId !== newAssignee) {
        notifications.push({
          userId: newAssignee,
          audience: 'user',
          title: 'New task assigned',
          message: `${title} was assigned to you`,
          type: 'info',
          entityType: 'task',
          entityId: log.entity_id,
          meta: {
            status: after.status ?? null,
            source: 'task_create',
          },
        });
      }
    }

    if (log.action === 'UPDATE') {
      if (newAssignee && newAssignee !== prevAssignee) {
        if (!actorId || actorId !== newAssignee) {
          notifications.push({
            userId: newAssignee,
            audience: 'user',
            title: 'Task assigned to you',
            message: `${title} is now assigned to you`,
            type: 'info',
            entityType: 'task',
            entityId: log.entity_id,
            meta: {
              previousAssignee: prevAssignee,
              status: after.status ?? null,
              source: 'task_reassignment',
            },
          });
        }
      }

      const statusChanged =
        before.status && after.status && before.status !== after.status;
      if (statusChanged && newAssignee) {
        notifications.push({
          userId: newAssignee,
          audience: 'user',
          title: 'Task status updated',
          message: `${title} is now ${after.status}`,
          type: after.status === 'completed' ? 'success' : 'info',
          entityType: 'task',
          entityId: log.entity_id,
          meta: {
            from: before.status,
            to: after.status,
            source: 'task_status_change',
          },
        });
      }
    }

    if (log.action === 'DELETE' && (prevAssignee || newAssignee)) {
      const target = newAssignee ?? prevAssignee;
      if (target && (!actorId || actorId !== target)) {
        notifications.push({
          userId: target,
          audience: 'user',
          title: 'Task removed',
          message: `${title} was deleted`,
          type: 'warning',
          entityType: 'task',
          entityId: log.entity_id,
          meta: { source: 'task_delete' },
        });
      }
    }

    return notifications;
  }

  private async fromSubtaskActivity(
    log: ActivityLog,
  ): Promise<CreateNotificationInput[]> {
    const notifications: CreateNotificationInput[] = [];
    const before = (log.before_data ?? {}) as Partial<Subtask> &
      Record<string, any>;
    const after = (log.after_data ?? {}) as Partial<Subtask> &
      Record<string, any>;

    const title = (after.title || before.title || 'Subtask').toString();
    const newAssignee =
      (after.assigned_to ?? after.assignedTo ?? null) as string | null;
    const prevAssignee =
      (before.assigned_to ?? before.assignedTo ?? null) as string | null;
    const actorId = log.user_id;

    if (log.action === 'CREATE' && newAssignee) {
      if (!actorId || actorId !== newAssignee) {
        notifications.push({
          userId: newAssignee,
          audience: 'user',
          title: 'New subtask assigned',
          message: `${title} was assigned to you`,
          type: 'info',
          entityType: 'subtask',
          entityId: log.entity_id,
          meta: { source: 'subtask_create' },
        });
      }
    }

    if (log.action === 'UPDATE') {
      if (newAssignee && newAssignee !== prevAssignee) {
        if (!actorId || actorId !== newAssignee) {
          notifications.push({
            userId: newAssignee,
            audience: 'user',
            title: 'Subtask assigned',
            message: `${title} is now assigned to you`,
            type: 'info',
            entityType: 'subtask',
            entityId: log.entity_id,
            meta: { source: 'subtask_reassignment' },
          });
        }
      }

      const statusChanged =
        before.status && after.status && before.status !== after.status;
      if (statusChanged && newAssignee) {
        notifications.push({
          userId: newAssignee,
          audience: 'user',
          title: 'Subtask status updated',
          message: `${title} is now ${after.status}`,
          type: after.status === 'completed' ? 'success' : 'info',
          entityType: 'subtask',
          entityId: log.entity_id,
          meta: {
            from: before.status,
            to: after.status,
            source: 'subtask_status_change',
          },
        });
      }
    }

    if (log.action === 'DELETE' && (newAssignee || prevAssignee)) {
      const target = newAssignee ?? prevAssignee;
      if (target && (!actorId || actorId !== target)) {
        notifications.push({
          userId: target,
          audience: 'user',
          title: 'Subtask removed',
          message: `${title} was deleted`,
          type: 'warning',
          entityType: 'subtask',
          entityId: log.entity_id,
          meta: { source: 'subtask_delete' },
        });
      }
    }

    return notifications;
  }

  private async fromProjectMemberActivity(
    log: ActivityLog,
  ): Promise<CreateNotificationInput[]> {
    const notifications: CreateNotificationInput[] = [];
    const before = (log.before_data ?? {}) as Partial<ProjectMember> &
      Record<string, any>;
    const after = (log.after_data ?? {}) as Partial<ProjectMember> &
      Record<string, any>;

    const userId = after.user_id ?? before.user_id;
    const projectId = after.project_id ?? before.project_id;
    if (!userId || !projectId) return notifications;

    const projectName = await this.getProjectName(projectId);

    if (log.action === 'CREATE') {
      notifications.push({
        userId,
        audience: 'user',
        title: 'Added to project',
        message: `You were added to ${projectName ?? 'a project'}`,
        type: 'success',
        entityType: 'project',
        entityId: projectId,
        meta: { source: 'project_member_add' },
      });
    }

    if (log.action === 'DELETE') {
      notifications.push({
        userId,
        audience: 'user',
        title: 'Removed from project',
        message: `You were removed from ${projectName ?? 'a project'}`,
        type: 'warning',
        entityType: 'project',
        entityId: projectId,
        meta: { source: 'project_member_remove' },
      });
    }

    return notifications;
  }

  private async fromProjectActivity(
    log: ActivityLog,
  ): Promise<CreateNotificationInput[]> {
    const notifications: CreateNotificationInput[] = [];
    const before = (log.before_data ?? {}) as Partial<Project> &
      Record<string, any>;
    const after = (log.after_data ?? {}) as Partial<Project> &
      Record<string, any>;
    const projectId = log.entity_id;
    if (!projectId) return notifications;

    const title = after.name || before.name || 'Project';
    const members = await this.getProjectMembers(projectId);
    const actorId = log.user_id;

    if (log.action === 'DELETE') {
      members
        .filter((id) => id && id !== actorId)
        .forEach((userId) =>
          notifications.push({
            userId,
            audience: 'user',
            title: 'Project deleted',
            message: `${title} was deleted`,
            type: 'warning',
            entityType: 'project',
            entityId: projectId,
            meta: { source: 'project_delete' },
          }),
        );
    }

    if (log.action === 'UPDATE') {
      const statusChanged =
        before.status && after.status && before.status !== after.status;
      if (statusChanged) {
        members
          .filter((id) => id && id !== actorId)
          .forEach((userId) =>
            notifications.push({
              userId,
              audience: 'user',
              title: 'Project status updated',
              message: `${title} is now ${after.status}`,
              type: 'info',
              entityType: 'project',
              entityId: projectId,
              meta: {
                from: before.status,
                to: after.status,
                source: 'project_status_change',
              },
            }),
          );
      }
    }

    return notifications;
  }

  private async fromUserActivity(
    log: ActivityLog,
  ): Promise<CreateNotificationInput[]> {
    const notifications: CreateNotificationInput[] = [];
    const before = (log.before_data ?? {}) as Record<string, any>;
    const after = (log.after_data ?? {}) as Record<string, any>;
    const userId = log.entity_id;
    const actorId = log.user_id;

    if (log.action === 'LOGIN') {
      notifications.push({
        audience: 'admin',
        title: 'User login',
        message: `${after.email ?? 'A user'} signed in`,
        type: 'info',
        entityType: 'user',
        entityId: userId,
        meta: {
          email: after.email ?? null,
          login_at: log.created_at ?? new Date().toISOString(),
          source: 'user_login',
        },
      });
    }

    if (log.action === 'UPDATE') {
      // Detect role changes
      const beforeRoles =
        Array.isArray(before.roles) && before.roles.length
          ? before.roles.map((r: any) =>
              (r?.name ?? r ?? '').toString().toLowerCase(),
            )
          : [];
      const afterRoles =
        Array.isArray(after.roles) && after.roles.length
          ? after.roles.map((r: any) =>
              (r?.name ?? r ?? '').toString().toLowerCase(),
            )
          : [];

      const rolesChanged =
        beforeRoles.sort().join(',') !== afterRoles.sort().join(',');

      if (rolesChanged && userId) {
        notifications.push({
          userId,
          audience: 'user',
          title: 'Roles updated',
          message: `Your roles were updated to ${afterRoles.join(', ') || 'none'}`,
          type: 'info',
          entityType: 'user',
          entityId: userId,
          meta: {
            beforeRoles,
            afterRoles,
            source: 'user_role_update',
          },
        });
      }
    }

    if (log.action === 'DELETE' && userId && (!actorId || actorId !== userId)) {
      notifications.push({
        audience: 'admin',
        title: 'User deleted',
        message: `${after.email || before.email || 'A user'} was deleted`,
        type: 'warning',
        entityType: 'user',
        entityId: userId,
        meta: { source: 'user_delete' },
      });
    }

    return notifications;
  }

  private async getProjectName(projectId: string): Promise<string | null> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      select: ['id', 'name'],
    });
    return project?.name ?? null;
  }
}

import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  DataSource,
  EntitySubscriberInterface,
  InsertEvent,
  RemoveEvent,
  UpdateEvent,
} from 'typeorm';
import { ActivityLogsService } from './activity-logs.service';
import { User } from '../users/entities/user.entity';
import { Project } from '../projects/entities/project.entity';
import { Task } from '../tasks/entities/task.entity';
import { Subtask } from '../subtasks/entities/subtask.entity';
import { ProjectMember } from '../project-members/entities/project-member.entity';

type EntityConstructor =
  | typeof User
  | typeof Project
  | typeof Task
  | typeof Subtask
  | typeof ProjectMember;

type TrackedEntity = User | Project | Task | Subtask | ProjectMember;

const ENTITY_TYPE_MAP = new Map<EntityConstructor, string>([
  [User, 'user'],
  [Project, 'project'],
  [Task, 'task'],
  [Subtask, 'subtask'],
  [ProjectMember, 'project_member'],
]);

@Injectable()
export class ActivityLogSubscriber
  implements EntitySubscriberInterface<TrackedEntity>
{
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly activityLogsService: ActivityLogsService,
  ) {
    this.dataSource.subscribers.push(this);
  }

  async afterInsert(event: InsertEvent<TrackedEntity>) {
    if (!this.shouldLog(event)) return;

    const entityType = this.resolveEntityType(event);
    if (!entityType) return;

    await this.activityLogsService.logActivity({
      entityType,
      entityId: this.extractId(this.toTrackedEntity(event.entity)),
      action: 'CREATE',
      beforeData: null,
      afterData: this.toTrackedEntity(event.entity),
    });
  }

  async afterUpdate(event: UpdateEvent<TrackedEntity>) {
    if (!this.shouldLog(event)) return;

    const entityType = this.resolveEntityType(event);
    if (!entityType) return;

    const before = this.toTrackedEntity(event.databaseEntity);
    const after = this.toTrackedEntity(event.entity) ?? before;

    if (!after && !before) return;

    const hasSoftDeleteTransition =
      this.isDeleted(before) === false && this.isDeleted(after) === true;

    const action = hasSoftDeleteTransition ? 'DELETE' : 'UPDATE';

    await this.activityLogsService.logActivity({
      entityType,
      entityId: this.extractId(after) ?? this.extractId(before),
      action,
      beforeData: before,
      afterData: after,
    });
  }

  async afterRemove(event: RemoveEvent<TrackedEntity>) {
    if (!this.shouldLog(event)) return;

    const entityType = this.resolveEntityType(event);
    if (!entityType) return;

    const before = this.toTrackedEntity(event.databaseEntity);
    const entityId =
      this.extractId(this.toTrackedEntity(event.entity)) ??
      this.extractId(before);

    await this.activityLogsService.logActivity({
      entityType,
      entityId,
      action: 'DELETE',
      beforeData: before,
      afterData: null,
    });
  }

  private shouldLog(
    event: InsertEvent<TrackedEntity> | UpdateEvent<TrackedEntity> | RemoveEvent<TrackedEntity>,
  ): boolean {
    if (event.metadata?.tableName === 'activity_logs') return false;
    const entityType = this.resolveEntityType(event);
    if (!entityType) return false;
    // project_members are logged manually to ensure composite keys are handled
    if (entityType === 'project_member') return false;
    return true;
  }

  private resolveEntityType(
    event: InsertEvent<TrackedEntity> | UpdateEvent<TrackedEntity> | RemoveEvent<TrackedEntity>,
  ): string | null {
    const target = event.metadata?.target as EntityConstructor | undefined;
    if (target && ENTITY_TYPE_MAP.has(target)) {
      return ENTITY_TYPE_MAP.get(target) ?? null;
    }
    return null;
  }

  private extractId(entity: TrackedEntity | null | undefined): string | null {
    if (!entity || typeof entity !== 'object') return null;
    const record = entity as unknown as Record<string, unknown>;
    if (typeof record.id === 'string') return record.id;
    if (typeof record.entity_id === 'string') return record.entity_id;
    return null;
  }

  private toTrackedEntity(value: unknown): TrackedEntity | null {
    if (value && typeof value === 'object') {
      return value as TrackedEntity;
    }
    return null;
  }

  private isDeleted(entity: TrackedEntity | null): boolean | undefined {
    if (!entity || typeof entity !== 'object') return undefined;
    const record = entity as unknown as Record<string, unknown>;
    if (typeof record.is_deleted === 'boolean') {
      return record.is_deleted;
    }
    return undefined;
  }
}

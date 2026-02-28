import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { ActivityLog } from './entities/activity-log.entity';
import { GetActivityLogsDto } from './dto/get-activity-logs.dto';
import { RequestContextService } from '../common/context/request-context.service';
import { NotificationsService } from '../notifications/notifications.service';

const SENSITIVE_KEYS = ['password', 'password_hash', 'token', 'secret'];

@Injectable()
export class ActivityLogsService {
  private readonly logger = new Logger('ActivityLogsService');

  constructor(
    @InjectRepository(ActivityLog)
    private readonly activityRepo: Repository<ActivityLog>,
    private readonly requestContext: RequestContextService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async logEntityChange(params: {
    entityType: string;
    entityId: string | null;
    action: string;
    before?: unknown | null;
    after?: unknown | null;
    meta?: Record<string, unknown> | null;
    userId?: string | null;
  }) {
    return this.logActivity({
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      beforeData: params.before ?? null,
      afterData: params.after ?? null,
      meta: params.meta ?? null,
      userId: params.userId ?? null,
    });
  }

  async logActivity(params: {
    entityType: string;
    entityId: string | null;
    action: string;
    beforeData?: unknown | null;
    afterData?: unknown | null;
    meta?: Record<string, unknown> | null;
    userId?: string | null;
  }): Promise<void> {
    const userId = params.userId ?? this.requestContext.getUserId() ?? null;
    const entityId =
      params.entityId ??
      this.extractEntityId(params.afterData ?? null) ??
      this.extractEntityId(params.beforeData ?? null);

    if (!entityId) {
      this.logger.warn(
        `Skipping activity log for ${params.entityType} because entity id is missing`,
      );
      return;
    }

    const log = this.activityRepo.create({
      entity_type: params.entityType,
      entity_id: entityId,
      action: params.action,
      before_data: this.sanitize(params.beforeData ?? null),
      after_data: this.sanitize(params.afterData ?? null),
      meta: params.meta ?? null,
      user_id: userId,
    });

    try {
      const saved = await this.activityRepo.save(log);
      await this.notificationsService.handleActivityLog(saved);
    } catch (error) {
      this.logger.error('Failed to persist activity log', error);
    }
  }

  private extractEntityId(source: unknown): string | null {
    if (!source || typeof source !== 'object') return null;
    const record = source as Record<string, unknown>;
    if (typeof record.id === 'string') return record.id;
    if (typeof record.entity_id === 'string') return record.entity_id;
    return null;
  }

  async list(query: GetActivityLogsDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 20));
    const sort =
      (query.sort ?? 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const qb = this.activityRepo
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .orderBy('log.created_at', sort)
      .skip((page - 1) * pageSize)
      .take(pageSize);

    this.applyFilters(qb, query);

    const [items, total] = await qb.getManyAndCount();

    return {
      items: items.map((item) => ({
        ...item,
        user: item.user
          ? {
              id: item.user.id,
              first_name: item.user.first_name,
              last_name: item.user.last_name,
              email: item.user.email,
            }
          : null,
      })),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        sort,
      },
    };
  }

  private applyFilters(
    qb: SelectQueryBuilder<ActivityLog>,
    query: GetActivityLogsDto,
  ) {
    if (query.userId) {
      qb.andWhere('log.user_id = :userId', { userId: query.userId });
    }
    if (query.entityType) {
      qb.andWhere('LOWER(log.entity_type) = LOWER(:entityType)', {
        entityType: query.entityType,
      });
    }
    if (query.action) {
      qb.andWhere('LOWER(log.action) = LOWER(:action)', {
        action: query.action,
      });
    }
  }

  private sanitize(data: unknown) {
    if (data === null || data === undefined) return null;

    const replacer = (key: string, value: unknown) => {
      if (value === undefined) return undefined;
      const lower = key.toLowerCase();
      if (SENSITIVE_KEYS.some((sensitive) => lower.includes(sensitive))) {
        return undefined;
      }
      return value;
    };

    // round-trip through JSON to drop functions / class instances
    try {
      return JSON.parse(JSON.stringify(data as unknown, replacer));
    } catch {
      return null;
    }
  }
}

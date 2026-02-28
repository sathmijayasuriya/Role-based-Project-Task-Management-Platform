import { Notification } from '../entities/notification.entity';

export class NotificationResponseDto {
  id: string;
  user_id: string | null;
  audience: string;
  title: string;
  message: string;
  type: string;
  entity_type: string | null;
  entity_id: string | null;
  activity_log_id: string | null;
  is_read: boolean;
  read_at: Date | null;
  meta: Record<string, any> | null;
  created_at: Date;

  static fromEntity(entity: Notification): NotificationResponseDto {
    return {
      id: entity.id,
      user_id: entity.user_id,
      audience: entity.audience,
      title: entity.title,
      message: entity.message,
      type: entity.type,
      entity_type: entity.entity_type,
      entity_id: entity.entity_id,
      activity_log_id: entity.activity_log_id,
      is_read: entity.is_read,
      read_at: entity.read_at ?? null,
      meta: entity.meta ?? null,
      created_at: entity.created_at,
    };
  }
}

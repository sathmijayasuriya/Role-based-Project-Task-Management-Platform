import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ActivityLog } from '../../activity-logs/entities/activity-log.entity';
import { User } from '../../users/entities/user.entity';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';
export type NotificationAudience = 'user' | 'admin';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  user_id: string | null;

  @Column({ type: 'varchar', length: 32, default: 'user' })
  audience: NotificationAudience;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({
    type: 'enum',
    enum: ['info', 'success', 'warning', 'error'],
    enumName: 'notification_type_enum',
    default: 'info',
  })
  type: NotificationType;

  @Column({ type: 'text', nullable: true })
  entity_type: string | null;

  @Column({ type: 'uuid', nullable: true })
  entity_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  activity_log_id: string | null;

  @ManyToOne(() => ActivityLog, {
    nullable: true,
    eager: false,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'activity_log_id' })
  activity_log?: ActivityLog | null;

  @ManyToOne(() => User, {
    nullable: true,
    eager: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user?: User | null;

  @Column({ type: 'boolean', default: false })
  is_read: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  read_at: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  meta: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}

import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Task } from 'src/tasks/entities/task.entity';
import { TASK_STATUS_VALUES } from 'src/tasks/constants/task.constants';
import type { TaskStatus } from 'src/tasks/constants/task.constants';

@Entity('subtasks')
export class Subtask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  task_id: string;

  @ManyToOne(() => Task, { eager: false })
  @JoinColumn({ name: 'task_id' })
  task?: Task;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'uuid', name: 'assigned_to', nullable: true })
  assigned_to?: string;

  @Column({
    type: 'enum',
    enum: TASK_STATUS_VALUES,
    default: 'todo',
  })
  status: TaskStatus;

  @Column({ type: 'date', nullable: true })
  due_date: string | null;

  @Column()
  created_by: string;

  @Column({ type: 'uuid', nullable: true })
  updated_by: string | null;

  @Column({ default: false })
  is_deleted: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  deleted_at: Date | null;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  created_at: Date;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  updated_at: Date;
}

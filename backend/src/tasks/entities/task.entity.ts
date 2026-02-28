import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Project } from 'src/projects/entities/project.entity';
import { Subtask } from 'src/subtasks/entities/subtask.entity';
import {
  TASK_PRIORITY_VALUES,
  TASK_STATUS_VALUES,
} from '../constants/task.constants';
import type { TaskPriority, TaskStatus } from '../constants/task.constants';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'uuid' })
  project_id: string;

  @ManyToOne(() => Project, { eager: false })
  @JoinColumn({ name: 'project_id' })
  project?: Project;

  @Column({ type: 'uuid', name: 'assigned_to', nullable: true })
  assigned_to?: string;

  @Column({
    type: 'enum',
    enum: TASK_STATUS_VALUES,
    default: 'todo',
  })
  status: TaskStatus;

  @Column({
    type: 'enum',
    enum: TASK_PRIORITY_VALUES,
    default: 'medium',
  })
  priority: TaskPriority;

  @Column({ type: 'date', nullable: true })
  due_date: string | null;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  progress_percent: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  estimated_hours: number | null;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  actual_hours: number | null;

  @Column({ type: 'integer', nullable: true })
  story_points: number | null;

  @Column({ type: 'integer', nullable: true })
  position: number | null;

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

  @OneToMany(() => Subtask, (subtask) => subtask.task)
  subtasks?: Subtask[];
}

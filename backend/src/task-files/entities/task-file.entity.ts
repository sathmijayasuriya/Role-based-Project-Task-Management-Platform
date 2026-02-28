import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Task } from 'src/tasks/entities/task.entity';

@Entity('task_files')
export class TaskFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  task_id: string;

  @ManyToOne(() => Task, { eager: false })
  @JoinColumn({ name: 'task_id' })
  task?: Task;

  @Column()
  original_name: string;

  @Column()
  storage_path: string;

  @Column({ nullable: true })
  mime_type?: string;

  @Column({ type: 'bigint', nullable: true })
  size_bytes?: string | null;

  @Column({ type: 'uuid' })
  uploaded_by: string;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  uploaded_at: Date;
}

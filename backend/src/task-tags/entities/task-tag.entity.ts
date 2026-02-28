import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Task } from 'src/tasks/entities/task.entity';
import { Tag } from 'src/tags/entities/tag.entity';

@Entity('task_tags')
@Unique(['task_id', 'tag_id'])
export class TaskTag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  task_id: string;

  @ManyToOne(() => Task, { eager: false })
  @JoinColumn({ name: 'task_id' })
  task?: Task;

  @Column({ type: 'uuid' })
  tag_id: string;

  @ManyToOne(() => Tag, { eager: false })
  @JoinColumn({ name: 'tag_id' })
  tag?: Tag;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  created_at: Date;
}

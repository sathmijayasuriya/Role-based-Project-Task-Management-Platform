import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('project_members')
export class ProjectMember {
  @PrimaryColumn('uuid')
  project_id: string;

  @PrimaryColumn('uuid')
  user_id: string;

  @Column({ nullable: true })
  assigned_role?: string;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  joined_at: Date;
}

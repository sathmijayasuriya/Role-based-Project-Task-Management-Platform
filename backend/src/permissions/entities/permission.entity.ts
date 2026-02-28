import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { Role } from 'src/roles/entities/role.entity';
import { PermissionName } from 'src/auth/constants/permissions.constants';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // you can type this as string or PermissionName
  @Column({ unique: true, length: 100 })
  name: PermissionName | string;

  @Column({ nullable: true })
  description?: string;

  @ManyToMany(() => Role, (role) => role.permissions)
  roles: Role[];
}

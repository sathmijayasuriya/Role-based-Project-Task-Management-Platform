import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedPermissions1710000001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // List of permission names and descriptions
    const permissions: { name: string; description: string }[] = [
      // User management
      { name: 'MANAGE_USERS', description: 'Create, edit, delete users' },
      { name: 'MANAGE_ROLES', description: 'Create, edit, delete roles' },
      {
        name: 'MANAGE_PERMISSIONS',
        description: 'Create, edit, delete permissions',
      },
      { name: 'VIEW_USERS', description: 'View user list and details' },

      // Reports
      { name: 'VIEW_REPORTS', description: 'View system reports' },

      // Projects
      { name: 'MANAGE_PROJECTS', description: 'Manage all projects' },
      { name: 'PROJECT_CREATE', description: 'Create new projects' },
      { name: 'PROJECT_VIEW_ALL', description: 'View all projects' },
      {
        name: 'PROJECT_VIEW_ASSIGNED',
        description: 'View only assigned projects',
      },
      { name: 'PROJECT_EDIT_ALL', description: 'Edit any project' },
      {
        name: 'PROJECT_EDIT_ASSIGNED',
        description: 'Edit assigned projects only',
      },
      { name: 'PROJECT_DELETE', description: 'Delete any project' },
      {
        name: 'PROJECT_MEMBER_ADD',
        description: 'Add project members',
      },
      // {
      //   name: 'PROJECT_MEMBER_ADD_BULK',
      //   description: 'Add multiple project members at once',
      // },
      {
        name: 'PROJECT_MEMBER_REMOVE',
        description: 'Remove project members',
      },
      {
        name: 'PROJECT_MEMBER_MANAGE',
        description: 'Manage project members (add/remove)',
      },
      // {
      //   name: 'PROJECT_MEMBER_REMOVE_BULK',
      //   description: 'Remove multiple project members at once',
      // },

      // Tasks
      { name: 'MANAGE_TASKS', description: 'Manage all tasks' },
      { name: 'TASK_CREATE', description: 'Create tasks' },
      { name: 'TASK_VIEW_ALL', description: 'View all tasks' },
      {
        name: 'TASK_VIEW_ASSIGNED',
        description: 'View tasks assigned to user or their projects',
      },
      { name: 'TASK_EDIT_ALL', description: 'Edit any task' },
      {
        name: 'TASK_EDIT_ASSIGNED',
        description: 'Edit assigned tasks only',
      },
      { name: 'TASK_DELETE', description: 'Delete tasks' },

      // Subtasks
      { name: 'SUBTASK_CREATE', description: 'Create subtasks' },
      { name: 'SUBTASK_VIEW_ALL', description: 'View all subtasks' },
      {
        name: 'SUBTASK_VIEW_ASSIGNED',
        description: 'View subtasks assigned to user or their tasks',
      },
      { name: 'SUBTASK_EDIT_ALL', description: 'Edit any subtask' },
      {
        name: 'SUBTASK_EDIT_ASSIGNED',
        description: 'Edit assigned subtasks only',
      },
      { name: 'SUBTASK_DELETE', description: 'Delete subtasks' },
    ];

    for (const perm of permissions) {
      await queryRunner.query(
        `
        INSERT INTO permissions (id, name, description)
        VALUES (uuid_generate_v4(), $1, $2)
        ON CONFLICT (name) DO NOTHING
      `,
        [perm.name, perm.description],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const names = [
      'MANAGE_USERS',
      'MANAGE_ROLES',
      'MANAGE_PERMISSIONS',
      'VIEW_USERS',
      'VIEW_REPORTS',
      'MANAGE_PROJECTS',
      'PROJECT_CREATE',
      'PROJECT_VIEW_ALL',
      'PROJECT_VIEW_ASSIGNED',
      'PROJECT_EDIT_ALL',
      'PROJECT_EDIT_ASSIGNED',
      'PROJECT_DELETE',
      'PROJECT_MEMBER_ADD',
      // 'PROJECT_MEMBER_ADD_BULK',
      'PROJECT_MEMBER_REMOVE',
      'PROJECT_MEMBER_MANAGE',
      // 'PROJECT_MEMBER_REMOVE_BULK',
      'MANAGE_TASKS',
      'TASK_CREATE',
      'TASK_VIEW_ALL',
      'TASK_VIEW_ASSIGNED',
      'TASK_EDIT_ALL',
      'TASK_EDIT_ASSIGNED',
      'TASK_DELETE',
      'SUBTASK_CREATE',
      'SUBTASK_VIEW_ALL',
      'SUBTASK_VIEW_ASSIGNED',
      'SUBTASK_EDIT_ALL',
      'SUBTASK_EDIT_ASSIGNED',
      'SUBTASK_DELETE',
    ];

    await queryRunner.query(
      `
      DELETE FROM permissions
      WHERE name = ANY($1)
    `,
      [names],
    );
  }
}

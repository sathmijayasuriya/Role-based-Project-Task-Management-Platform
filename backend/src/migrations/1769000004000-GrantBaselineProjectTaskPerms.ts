import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Grants baseline permissions so non-admin users can:
 * - create tasks
 * - view tasks assigned to them or their projects
 * - view projects they are assigned to
 *
 * Also reinforces admin access to all tasks/projects.
 */
export class GrantBaselineProjectTaskPerms1769000004000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Helper CTE to avoid repeated subqueries
    await queryRunner.query(`
      WITH user_roles AS (
        SELECT id FROM roles WHERE LOWER(name) IN ('user', 'member')
      ),
      admin_roles AS (
        SELECT id FROM roles WHERE LOWER(name) = 'admin'
      ),
      user_perms AS (
        SELECT id FROM permissions
        WHERE name IN ('TASK_CREATE', 'TASK_VIEW_ASSIGNED', 'PROJECT_VIEW_ASSIGNED')
      ),
      admin_perms AS (
        SELECT id FROM permissions
        WHERE name IN (
          'TASK_CREATE', 'TASK_VIEW_ALL', 'TASK_VIEW_ASSIGNED',
          'PROJECT_VIEW_ALL', 'PROJECT_VIEW_ASSIGNED',
          'PROJECT_EDIT_ALL', 'TASK_EDIT_ALL'
        )
      )
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM user_roles r CROSS JOIN user_perms p
      ON CONFLICT DO NOTHING;
    `);

    await queryRunner.query(`
      WITH admin_roles AS (
        SELECT id FROM roles WHERE LOWER(name) = 'admin'
      ),
      admin_perms AS (
        SELECT id FROM permissions
        WHERE name IN (
          'TASK_CREATE', 'TASK_VIEW_ALL', 'TASK_VIEW_ASSIGNED',
          'PROJECT_VIEW_ALL', 'PROJECT_VIEW_ASSIGNED',
          'PROJECT_EDIT_ALL', 'TASK_EDIT_ALL'
        )
      )
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM admin_roles r CROSS JOIN admin_perms p
      ON CONFLICT DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM role_permissions
      WHERE permission_id IN (
        SELECT id FROM permissions
        WHERE name IN (
          'TASK_CREATE', 'TASK_VIEW_ASSIGNED', 'PROJECT_VIEW_ASSIGNED',
          'TASK_VIEW_ALL', 'PROJECT_VIEW_ALL', 'PROJECT_EDIT_ALL', 'TASK_EDIT_ALL'
        )
      )
      AND role_id IN (
        SELECT id FROM roles WHERE LOWER(name) IN ('user', 'member', 'admin')
      );
    `);
  }
}

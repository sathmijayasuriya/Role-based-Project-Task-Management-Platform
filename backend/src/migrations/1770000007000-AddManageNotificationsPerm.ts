import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds MANAGE_NOTIFICATIONS permission and grants it to the admin role.
 */
export class AddManageNotificationsPerm1770000007000
  implements MigrationInterface
{
  private readonly permName = 'MANAGE_NOTIFICATIONS';
  private readonly permDescription = 'Create and send notifications to user roles';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      INSERT INTO permissions (id, name, description)
      VALUES (uuid_generate_v4(), $1, $2)
      ON CONFLICT (name) DO NOTHING
    `,
      [this.permName, this.permDescription],
    );

    // Grant to admin role if it exists
    await queryRunner.query(
      `
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      JOIN permissions p ON p.name = $1
      WHERE LOWER(r.name) = 'admin'
      ON CONFLICT DO NOTHING
    `,
      [this.permName],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove role → permission links first
    await queryRunner.query(
      `
      DELETE FROM role_permissions
      WHERE permission_id IN (SELECT id FROM permissions WHERE name = $1)
    `,
      [this.permName],
    );

    // Remove the permission
    await queryRunner.query(
      `
      DELETE FROM permissions
      WHERE name = $1
    `,
      [this.permName],
    );
  }
}

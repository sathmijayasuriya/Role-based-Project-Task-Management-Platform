import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectMemberViewPerm1710000003000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const perm = {
      name: 'PROJECT_MEMBER_VIEW',
      description: 'View project members',
    };

    await queryRunner.query(
      `
        INSERT INTO permissions (id, name, description)
        VALUES (uuid_generate_v4(), $1, $2)
        ON CONFLICT (name) DO NOTHING
      `,
      [perm.name, perm.description],
    );

    // assign to admin role if present
    await queryRunner.query(
      `
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id
        FROM roles r
        JOIN permissions p ON p.name = $1
        WHERE r.name = 'admin'
        ON CONFLICT DO NOTHING
      `,
      [perm.name],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
        DELETE FROM permissions
        WHERE name = $1
      `,
      ['PROJECT_MEMBER_VIEW'],
    );
  }
}

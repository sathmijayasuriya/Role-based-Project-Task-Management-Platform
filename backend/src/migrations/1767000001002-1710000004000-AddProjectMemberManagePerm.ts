import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectMemberManagePerm1710000004000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const perm = {
      name: 'PROJECT_MEMBER_MANAGE',
      description: 'Manage project members (add/remove)',
    };

    await queryRunner.query(
      `
        INSERT INTO permissions (id, name, description)
        VALUES (uuid_generate_v4(), $1, $2)
        ON CONFLICT (name) DO NOTHING
      `,
      [perm.name, perm.description],
    );

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
      ['PROJECT_MEMBER_MANAGE'],
    );
  }
}

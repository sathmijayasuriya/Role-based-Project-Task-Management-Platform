import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectMemberBulkPerms1710000002000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const perms = [
      {
        name: 'PROJECT_MEMBER_ADD_BULK',
        description: 'Add multiple project members at once',
      },
      {
        name: 'PROJECT_MEMBER_REMOVE_BULK',
        description: 'Remove multiple project members at once',
      },
    ];

    for (const perm of perms) {
      await queryRunner.query(
        `
          INSERT INTO permissions (id, name, description)
          VALUES (uuid_generate_v4(), $1, $2)
          ON CONFLICT (name) DO NOTHING
        `,
        [perm.name, perm.description],
      );
    }

    // Optional: assign to admin role if it exists
    await queryRunner.query(
      `
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id
        FROM roles r
        JOIN permissions p ON p.name = ANY($1)
        WHERE r.name = 'admin'
        ON CONFLICT DO NOTHING
      `,
      [[perms[0].name, perms[1].name]],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
        DELETE FROM permissions
        WHERE name = ANY($1)
      `,
      [['PROJECT_MEMBER_ADD_BULK', 'PROJECT_MEMBER_REMOVE_BULK']],
    );
  }
}

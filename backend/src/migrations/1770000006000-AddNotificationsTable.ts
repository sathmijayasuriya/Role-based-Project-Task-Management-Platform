import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the notifications table to store user and admin notifications.
 */
export class AddNotificationsTable1770000006000 implements MigrationInterface {
  name = 'AddNotificationsTable1770000006000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure enum exists
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'notification_type_enum'
        ) THEN
          CREATE TYPE "notification_type_enum" AS ENUM ('info', 'success', 'warning', 'error');
        END IF;
      END$$;
    `);

    // Create table if missing
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'notifications'
        ) THEN
          CREATE TABLE "notifications" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "user_id" uuid NULL,
            "audience" varchar(32) NOT NULL DEFAULT 'user',
            "title" text NOT NULL,
            "message" text NOT NULL,
            "type" "notification_type_enum" NOT NULL DEFAULT 'info',
            "entity_type" text NULL,
            "entity_id" uuid NULL,
            "activity_log_id" uuid NULL,
            "is_read" boolean NOT NULL DEFAULT false,
            "read_at" timestamptz NULL,
            "meta" jsonb NULL,
            "created_at" timestamptz NOT NULL DEFAULT now(),
            CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
            CONSTRAINT "notifications_activity_log_id_fkey" FOREIGN KEY ("activity_log_id") REFERENCES "activity_logs"("id") ON DELETE SET NULL
          );
        END IF;
      END$$;
    `);

    // If table already existed, align schema
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "audience" varchar(32) NOT NULL DEFAULT 'user'`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "activity_log_id" uuid NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "meta" jsonb NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "entity_type" text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "entity_id" uuid NULL`,
    );
    // Make user_id nullable to support admin/global notifications
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "user_id" DROP NOT NULL`,
    );
    // Ensure message is NOT NULL
    await queryRunner.query(
      `UPDATE "notifications" SET "message" = '' WHERE "message" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "message" SET NOT NULL`,
    );
    // Convert type column to enum
    await queryRunner.query(`
      ALTER TABLE "notifications"
      ALTER COLUMN "type"
      TYPE "notification_type_enum"
      USING (
        CASE
          WHEN "type"::text IN ('info','success','warning','error') THEN "type"::text::notification_type_enum
          ELSE 'info'::notification_type_enum
        END
      )
    `);
    // Add FK to activity_logs if not present
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.constraint_column_usage
          WHERE table_name = 'notifications'
            AND constraint_name = 'notifications_activity_log_id_fkey'
        ) THEN
          ALTER TABLE "notifications"
          ADD CONSTRAINT "notifications_activity_log_id_fkey"
          FOREIGN KEY ("activity_log_id") REFERENCES "activity_logs"("id") ON DELETE SET NULL;
        END IF;
      END$$;
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_notifications_user_read_created" ON "notifications" ("user_id", "is_read", "created_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_notifications_audience_created" ON "notifications" ("audience", "created_at" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_notifications_audience_created"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_notifications_user_read_created"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_type_enum"`);
  }
}

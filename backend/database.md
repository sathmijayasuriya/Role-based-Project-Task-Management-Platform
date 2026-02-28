#db plan

psql -U postgres -d postgres 2


CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_status_enum AS ENUM ('active', 'inactive', 'pending', 'banned');

CREATE TYPE project_status_enum AS ENUM ('active', 'archived', 'completed', 'on_hold');

CREATE TYPE project_visibility_enum AS ENUM ('private', 'organization', 'public');


CREATE TYPE task_status_enum AS ENUM (
  'todo',
  'in_progress',
  'review',
  'completed',
  'blocked',
  'cancelled'
);

CREATE TYPE task_priority_enum AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE theme_enum AS ENUM ('light', 'dark', 'system');


-- USERS
CREATE TABLE users (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name          TEXT NOT NULL,
  last_name           TEXT NOT NULL,
  email               TEXT NOT NULL UNIQUE,
  password_hash       TEXT NOT NULL,
  profile_picture_url TEXT,
  phone               TEXT,
  status              user_status_enum NOT NULL DEFAULT 'active',
  is_email_verified   BOOLEAN NOT NULL DEFAULT FALSE,
  last_login_at       TIMESTAMPTZ,
  is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ROLES
CREATE TABLE roles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(50) NOT NULL UNIQUE,
  description TEXT
);

-- PERMISSIONS
CREATE TABLE permissions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- ROLE_PERMISSIONS (Many-to-Many)
CREATE TABLE role_permissions (
  role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- Projects & Project Members
-- PROJECTS
CREATE TABLE projects (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  description TEXT,
  status      project_status_enum NOT NULL DEFAULT 'active',
  priority    task_priority_enum,
  start_date  DATE,
  end_date    DATE,
  created_by  UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  updated_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  is_deleted  BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PROJECT_MEMBERS
CREATE TABLE project_members (
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_role TEXT,
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (project_id, user_id)
);



--3. Tasks, Subtasks, Comments
-- TASKS
CREATE TABLE tasks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  priority        task_priority_enum NOT NULL DEFAULT 'medium',
  status          task_status_enum NOT NULL DEFAULT 'todo',
  due_date        TIMESTAMPTZ,
  start_date      TIMESTAMPTZ,
  assigned_to     UUID REFERENCES users(id) ON DELETE SET NULL,
  estimated_hours NUMERIC(5,2),
  actual_hours    NUMERIC(5,2),
  story_points    INTEGER,
  position        INTEGER, -- for Kanban ordering
  created_by      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  updated_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SUBTASKS
CREATE TABLE subtasks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  status      task_status_enum NOT NULL DEFAULT 'todo',
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  position    INTEGER,
  due_date    TIMESTAMPTZ,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  is_deleted  BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TASK_COMMENTS
CREATE TABLE task_comments (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id            UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_comment_id  UUID REFERENCES task_comments(id) ON DELETE CASCADE,
  comment_text       TEXT NOT NULL,
  is_edited          BOOLEAN NOT NULL DEFAULT FALSE,
  is_deleted         BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tasks
  ADD COLUMN progress_percent NUMERIC(5,2) NOT NULL DEFAULT 0;

ALTER TABLE projects
  ADD COLUMN progress_percent NUMERIC(5,2) NOT NULL DEFAULT 0;
ALTER TABLE subtasks
  ADD COLUMN description TEXT;
ALTER TABLE subtasks
  ADD COLUMN updated_by UUID REFERENCES users(id) ON DELETE SET null;

CREATE TABLE clients (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                TEXT NOT NULL,
  contact_person_name TEXT,
  email               TEXT,
  phone               TEXT,
  logo_url            TEXT,       -- or logo_path if you want
  notes               TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE projects
  ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE SET NULL;


----- FILE_UPLOADS
CREATE TABLE file_uploads (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id         UUID REFERENCES tasks(id) ON DELETE CASCADE,
  uploaded_by     UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  file_url        TEXT NOT NULL,
  file_name       TEXT NOT NULL,
  file_type       TEXT,
  file_size       BIGINT,
  storage_provider TEXT,      -- e.g. 'local', 's3'
  checksum        TEXT,
  is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at      TIMESTAMPTZ,
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


--5. Tags & Task Tags (Labels)
-- TAGS
CREATE TABLE tags (
  id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name  VARCHAR(50) NOT NULL UNIQUE,
  color VARCHAR(9)  -- e.g. #F97316
);

-- TASK_TAGS (Many-to-Many)
CREATE TABLE task_tags (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id  UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);



--6 Notifications
-- NOTIFICATIONS
CREATE TABLE notifications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,  -- e.g. 'TASK_ASSIGNED', 'COMMENT_ADDED'
  title        TEXT NOT NULL,
  message      TEXT,
  entity_type  TEXT,           -- 'task', 'project', 'user', etc.
  entity_id    UUID,
  is_read      BOOLEAN NOT NULL DEFAULT FALSE,
  read_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helpful index for unread notifications per user
CREATE INDEX idx_notifications_user_unread
  ON notifications (user_id, is_read, created_at DESC);


-- 7Activity / Audit Logs
-- ACTIVITY_LOGS / AUDIT_LOGS
CREATE TABLE activity_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,   -- 'task', 'project', 'comment', 'user', etc.
  entity_id   UUID NOT NULL,
  action      TEXT NOT NULL,   -- 'CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', ...
  before_data JSONB,
  after_data  JSONB,
  meta        JSONB,           -- IP, user agent, etc.
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- For per-entity history lookup
CREATE INDEX idx_activity_logs_entity
  ON activity_logs (entity_type, entity_id, created_at DESC);

-- For per-user timeline
CREATE INDEX idx_activity_logs_user
  ON activity_logs (user_id, created_at DESC);



-- 8. User Settings (Theme, Preferences )

-- USER_SETTINGS
CREATE TABLE user_settings (
  user_id                      UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme                        theme_enum NOT NULL DEFAULT 'system', -- 'light', 'dark', 'system'
  language                     VARCHAR(10) DEFAULT 'en',
  notification_email_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
  notification_inapp_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Auth Tokens (Refresh, Reset, Email Verification)
-- REFRESH TOKENS / SESSIONS
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL,           -- store hashed token
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  user_agent  TEXT,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user
  ON refresh_tokens (user_id, expires_at);

-- PASSWORD RESET TOKENS
CREATE TABLE password_reset_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL,           -- store hashed token
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- EMAIL VERIFICATION TOKENS
CREATE TABLE email_verification_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL,           -- store hashed token
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


--10. Useful Indexes for Tasks & Projects
-- TASK indexes
CREATE INDEX idx_tasks_project
  ON tasks (project_id);

CREATE INDEX idx_tasks_assigned_to
  ON tasks (assigned_to);

CREATE INDEX idx_tasks_status
  ON tasks (status);

CREATE INDEX idx_tasks_due_date
  ON tasks (due_date);

-- PROJECT index
CREATE INDEX idx_projects_status
  ON projects (status);


# Project Setup Complete! 🎉

## What We Built

A **modern, professional Angular 20 Project Management System** with:

### ✅ Features Implemented

1. **Role-Based Authentication**

   -  JWT-based login system
   -  Admin and User roles
   -  Separate dashboards for different roles
   -  Permission-based access control

2. **Dark Theme UI** (Matching your design reference)

   -  Premium dark theme with modern aesthetics
   -  Collapsible sidebar navigation
   -  Responsive layouts
   -  Material Design components

3. **State Management with Signals**

   -  No external state libraries needed
   -  Reactive and type-safe
   -  Angular 20 best practices

4. **Professional Architecture**
   -  Modular folder structure
   -  Lazy loading for performance
   -  HTTP interceptors (auth & error handling)
   -  Route guards for security

## 🚀 Quick Start

The development server is **already running** on:
**http://localhost:4200**

### Demo Credentials

**Admin User:**

-  Email: `admin@example.com`
-  Password: `Admin@@##123`

**Regular User:**

-  Email: `user@example.com`
-  Password: `User@@##123`

## 📁 Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── app.config.ts          # App configuration
│   │   ├── app.routes.ts          # Routing with guards
│   │   └── app.ts                 # Root component
│   ├── core/                      # Singleton services
│   │   ├── guards/                # Auth & role guards
│   │   ├── interceptors/          # HTTP interceptors
│   │   ├── models/                # TypeScript interfaces
│   │   └── services/              # Auth service with signals
│   ├── features/                  # Feature modules
│   │   ├── auth/                  # Login component
│   │   ├── dashboard/             # User dashboard
│   │   ├── admin/                 # Admin dashboard
│   │   ├── projects/              # Projects (placeholder)
│   │   └── tasks/                 # Tasks (placeholder)
│   ├── layouts/                   # Layout components
│   │   └── main-layout/           # Sidebar + header layout
│   ├── environments/              # Environment config
│   └── styles.scss                # Global dark theme styles
```

## 🎨 UI Components Created

### ✅ Login Page

-  Email/password form
-  Loading states
-  Error handling
-  Demo credentials display
-  Auto-redirect based on role

### ✅ Main Layout (Sidebar + Header)

-  Collapsible sidebar navigation
-  User profile section
-  Role-based menu items
-  Top header with search
-  Notification badges
-  User dropdown menu
-  Responsive design

### ✅ User Dashboard

-  Welcome header
-  4 stat cards (Total Tasks, In Progress, Completed, Overdue)
-  Tasks table with status/priority badges
-  Recent activity timeline
-  Fully responsive

### ✅ Admin Dashboard

-  System stats overview
-  Quick action buttons
-  Recent users table
-  System activity log
-  Admin-only access

## 🔐 Security Features

-  **Auth Guard**: Protects routes requiring authentication
-  **Role Guard**: Restricts admin-only routes
-  **JWT Interceptor**: Auto-adds token to requests
-  **Error Interceptor**: Global error handling (401/403)

## 🎯 State Management

Using **Angular Signals** for reactive state:

```typescript
// Auth Service
currentUser = signal<User | null>(null);
isAuthenticated = signal<boolean>(false);
isAdmin = computed(() => userRoles().includes("admin"));
```

## 🔌 Backend Integration

The frontend connects to your NestJS backend at:

-  `http://localhost:3000`

**Available API Endpoints:**

-  `POST /auth/login` - Login
-  `GET /users/me` - Current user
-  `GET /admin/users` - List users (admin)
-  `GET /admin/roles` - List roles (admin)
-  And more...

## 📝 Next Steps

### Immediate

1. ✅ Run `cd frontend && npm start` - **ALREADY RUNNING!**
2. ✅ Open `http://localhost:4200` in your browser
3. ✅ Login with demo credentials
4. ✅ See different dashboards for admin vs user

### Future Enhancements

-  [ ] Complete Projects CRUD operations
-  [ ] Build Task management features
-  [ ] Add User management admin panel
-  [ ] Implement Role & Permission management
-  [ ] Create Notifications system
-  [ ] Add File upload functionality
-  [ ] Build Analytics dashboards
-  [ ] Add Dark/Light theme toggle

## 🛠 Technologies Used

-  **Angular 20** - Latest framework (zoneless mode)
-  **Angular Material** - UI components
-  **TypeScript** - Type safety
-  **SCSS** - Advanced styling
-  **RxJS** - Reactive programming
-  **Signals** - State management

## 📖 Key Files to Explore

1. `src/core/services/auth.service.ts` - Authentication & signals
2. `src/layouts/main-layout/main-layout.component.ts` - Main UI layout
3. `src/features/dashboard/components/user-dashboard.component.ts` - User dashboard
4. `src/features/admin/components/admin-dashboard.component.ts` - Admin dashboard
5. `src/styles.scss` - Dark theme global styles
6. `src/app/app.routes.ts` - Routing configuration

## 💡 Tips

-  **Switching Roles**: Logout and login with different credentials to see role-based UI
-  **Sidebar**: Click the chevron button to collapse/expand
-  **Responsive**: Resize browser to see mobile layout
-  **Navigation**: Click sidebar items to navigate (some routes redirect to dashboard as placeholders)

## ⚠️ Important Notes

1. **Backend Required**: Make sure your NestJS backend is running on port 3000
2. **CORS**: Ensure backend has CORS enabled for `http://localhost:4200`
3. **Demo Data**: Currently using mock data; connect to real API endpoints as needed

## 🎉 Success!

Your Angular 20 Project Management System is ready! The UI matches the dark theme dashboard you provided, with modern components, role-based access, and professional structure.

**Access it now at:** [http://localhost:4200](http://localhost:4200)

Enjoy building! 🚀

## DB SCHEMA

-- DROP SCHEMA public;

CREATE SCHEMA public AUTHORIZATION postgres;

-- DROP TYPE public."project_status_enum";

CREATE TYPE public."project_status_enum" AS ENUM (
'active',
'archived',
'completed',
'on_hold');

-- DROP TYPE public."project_visibility_enum";

CREATE TYPE public."project_visibility_enum" AS ENUM (
'private',
'organization',
'public');

-- DROP TYPE public."task_priority_enum";

CREATE TYPE public."task_priority_enum" AS ENUM (
'low',
'medium',
'high',
'critical');

-- DROP TYPE public."task_status_enum";

CREATE TYPE public."task_status_enum" AS ENUM (
'todo',
'in_progress',
'review',
'completed',
'blocked',
'cancelled');

-- DROP TYPE public."theme_enum";

CREATE TYPE public."theme_enum" AS ENUM (
'light',
'dark',
'system');

-- DROP TYPE public."user_status_enum";

CREATE TYPE public."user_status_enum" AS ENUM (
'active',
'inactive',
'pending',
'banned');

-- DROP SEQUENCE public.migrations_id_seq;

CREATE SEQUENCE public.migrations_id_seq
INCREMENT BY 1
MINVALUE 1
MAXVALUE 2147483647
START 1
CACHE 1
NO CYCLE;

-- Permissions

ALTER SEQUENCE public.migrations_id_seq OWNER TO postgres;
GRANT ALL ON SEQUENCE public.migrations_id_seq TO postgres;
-- public.clients definition

-- Drop table

-- DROP TABLE public.clients;

CREATE TABLE public.clients ( id uuid DEFAULT uuid_generate_v4() NOT NULL, "name" text NOT NULL, contact_person_name text NULL, email text NULL, phone text NULL, logo_url text NULL, notes text NULL, is_active bool DEFAULT true NOT NULL, created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL, CONSTRAINT clients_pkey PRIMARY KEY (id));

-- Permissions

ALTER TABLE public.clients OWNER TO postgres;
GRANT ALL ON TABLE public.clients TO postgres;

-- public.migrations definition

-- Drop table

-- DROP TABLE public.migrations;

CREATE TABLE public.migrations ( id serial4 NOT NULL, "timestamp" int8 NOT NULL, "name" varchar NOT NULL, CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY (id));

-- Permissions

ALTER TABLE public.migrations OWNER TO postgres;
GRANT ALL ON TABLE public.migrations TO postgres;

-- public.permissions definition

-- Drop table

-- DROP TABLE public.permissions;

CREATE TABLE public.permissions ( id uuid DEFAULT uuid_generate_v4() NOT NULL, "name" varchar(100) NOT NULL, description text NULL, CONSTRAINT permissions_name_key UNIQUE (name), CONSTRAINT permissions_pkey PRIMARY KEY (id));

-- Permissions

ALTER TABLE public.permissions OWNER TO postgres;
GRANT ALL ON TABLE public.permissions TO postgres;

-- public.roles definition

-- Drop table

-- DROP TABLE public.roles;

CREATE TABLE public.roles ( id uuid DEFAULT uuid_generate_v4() NOT NULL, "name" varchar(50) NOT NULL, description text NULL, CONSTRAINT roles_name_key UNIQUE (name), CONSTRAINT roles_pkey PRIMARY KEY (id));

-- Permissions

ALTER TABLE public.roles OWNER TO postgres;
GRANT ALL ON TABLE public.roles TO postgres;

-- public.tags definition

-- Drop table

-- DROP TABLE public.tags;

CREATE TABLE public.tags ( id uuid DEFAULT uuid_generate_v4() NOT NULL, "name" varchar(50) NOT NULL, color varchar(9) NULL, CONSTRAINT tags_name_key UNIQUE (name), CONSTRAINT tags_pkey PRIMARY KEY (id));

-- Permissions

ALTER TABLE public.tags OWNER TO postgres;
GRANT ALL ON TABLE public.tags TO postgres;

-- public.users definition

-- Drop table

-- DROP TABLE public.users;

CREATE TABLE public.users ( id uuid DEFAULT uuid_generate_v4() NOT NULL, first_name text NOT NULL, last_name text NOT NULL, email text NOT NULL, password_hash text NOT NULL, profile_picture_path text NULL, phone text NULL, status public."user_status_enum" DEFAULT 'active'::user_status_enum NOT NULL, is_email_verified bool DEFAULT false NOT NULL, last_login_at timestamptz NULL, is_deleted bool DEFAULT false NOT NULL, deleted_at timestamptz NULL, created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL, CONSTRAINT users_email_key UNIQUE (email), CONSTRAINT users_pkey PRIMARY KEY (id));

-- Permissions

ALTER TABLE public.users OWNER TO postgres;
GRANT ALL ON TABLE public.users TO postgres;

-- public.activity_logs definition

-- Drop table

-- DROP TABLE public.activity_logs;

CREATE TABLE public.activity_logs ( id uuid DEFAULT uuid_generate_v4() NOT NULL, user_id uuid NULL, entity_type text NOT NULL, entity_id uuid NOT NULL, "action" text NOT NULL, before_data jsonb NULL, after_data jsonb NULL, meta jsonb NULL, created_at timestamptz DEFAULT now() NOT NULL, CONSTRAINT activity_logs_pkey PRIMARY KEY (id), CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL);
CREATE INDEX idx_activity_logs_entity ON public.activity_logs USING btree (entity_type, entity_id, created_at DESC);
CREATE INDEX idx_activity_logs_user ON public.activity_logs USING btree (user_id, created_at DESC);

-- Permissions

ALTER TABLE public.activity_logs OWNER TO postgres;
GRANT ALL ON TABLE public.activity_logs TO postgres;

-- public.email_verification_tokens definition

-- Drop table

-- DROP TABLE public.email_verification_tokens;

CREATE TABLE public.email_verification_tokens ( id uuid DEFAULT uuid_generate_v4() NOT NULL, user_id uuid NOT NULL, "token" text NOT NULL, expires_at timestamptz NOT NULL, used_at timestamptz NULL, created_at timestamptz DEFAULT now() NOT NULL, CONSTRAINT email_verification_tokens_pkey PRIMARY KEY (id), CONSTRAINT email_verification_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE);

-- Permissions

ALTER TABLE public.email_verification_tokens OWNER TO postgres;
GRANT ALL ON TABLE public.email_verification_tokens TO postgres;

-- public.notifications definition

-- Drop table

-- DROP TABLE public.notifications;

CREATE TABLE public.notifications ( id uuid DEFAULT uuid_generate_v4() NOT NULL, user_id uuid NOT NULL, "type" text NOT NULL, title text NOT NULL, message text NULL, entity_type text NULL, entity_id uuid NULL, is_read bool DEFAULT false NOT NULL, read_at timestamptz NULL, created_at timestamptz DEFAULT now() NOT NULL, CONSTRAINT notifications_pkey PRIMARY KEY (id), CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE);
CREATE INDEX idx_notifications_user_unread ON public.notifications USING btree (user_id, is_read, created_at DESC);

-- Permissions

ALTER TABLE public.notifications OWNER TO postgres;
GRANT ALL ON TABLE public.notifications TO postgres;

-- public.password_reset_tokens definition

-- Drop table

-- DROP TABLE public.password_reset_tokens;

CREATE TABLE public.password_reset_tokens ( id uuid DEFAULT uuid_generate_v4() NOT NULL, user_id uuid NOT NULL, "token" text NOT NULL, expires_at timestamptz NOT NULL, used_at timestamptz NULL, created_at timestamptz DEFAULT now() NOT NULL, CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id), CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE);

-- Permissions

ALTER TABLE public.password_reset_tokens OWNER TO postgres;
GRANT ALL ON TABLE public.password_reset_tokens TO postgres;

-- public.projects definition

-- Drop table

-- DROP TABLE public.projects;

CREATE TABLE public.projects ( id uuid DEFAULT uuid_generate_v4() NOT NULL, "name" text NOT NULL, description text NULL, status public."project_status_enum" DEFAULT 'active'::project_status_enum NOT NULL, priority public."task_priority_enum" NULL, start_date date NULL, end_date date NULL, created_by uuid NOT NULL, updated_by uuid NULL, is_deleted bool DEFAULT false NOT NULL, deleted_at timestamptz NULL, created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL, progress_percent numeric(5, 2) DEFAULT 0 NOT NULL, client_id uuid NULL, CONSTRAINT projects_pkey PRIMARY KEY (id), CONSTRAINT projects_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL, CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT, CONSTRAINT projects_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL);
CREATE INDEX idx_projects_status ON public.projects USING btree (status);

-- Permissions

ALTER TABLE public.projects OWNER TO postgres;
GRANT ALL ON TABLE public.projects TO postgres;

-- public.refresh_tokens definition

-- Drop table

-- DROP TABLE public.refresh_tokens;

CREATE TABLE public.refresh_tokens ( id uuid DEFAULT uuid_generate_v4() NOT NULL, user_id uuid NOT NULL, "token" text NOT NULL, expires_at timestamptz NOT NULL, revoked_at timestamptz NULL, user_agent text NULL, ip_address text NULL, created_at timestamptz DEFAULT now() NOT NULL, CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id), CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE);
CREATE INDEX idx_refresh_tokens_user ON public.refresh_tokens USING btree (user_id, expires_at);

-- Permissions

ALTER TABLE public.refresh_tokens OWNER TO postgres;
GRANT ALL ON TABLE public.refresh_tokens TO postgres;

-- public.role_permissions definition

-- Drop table

-- DROP TABLE public.role_permissions;

CREATE TABLE public.role_permissions ( role_id uuid NOT NULL, permission_id uuid NOT NULL, CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id), CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE, CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE);

-- Permissions

ALTER TABLE public.role_permissions OWNER TO postgres;
GRANT ALL ON TABLE public.role_permissions TO postgres;

-- public.tasks definition

-- Drop table

-- DROP TABLE public.tasks;

CREATE TABLE public.tasks ( id uuid DEFAULT uuid_generate_v4() NOT NULL, project_id uuid NOT NULL, title text NOT NULL, description text NULL, priority public."task_priority_enum" DEFAULT 'medium'::task_priority_enum NOT NULL, status public."task_status_enum" DEFAULT 'todo'::task_status_enum NOT NULL, due_date timestamptz NULL, start_date timestamptz NULL, assigned_to uuid NULL, estimated_hours numeric(5, 2) NULL, actual_hours numeric(5, 2) NULL, story_points int4 NULL, "position" int4 NULL, created_by uuid NOT NULL, updated_by uuid NULL, is_deleted bool DEFAULT false NOT NULL, deleted_at timestamptz NULL, created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL, progress_percent numeric(5, 2) DEFAULT 0 NOT NULL, CONSTRAINT tasks_pkey PRIMARY KEY (id), CONSTRAINT tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL, CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT, CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE, CONSTRAINT tasks_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL);
CREATE INDEX idx_tasks_assigned_to ON public.tasks USING btree (assigned_to);
CREATE INDEX idx_tasks_due_date ON public.tasks USING btree (due_date);
CREATE INDEX idx_tasks_project ON public.tasks USING btree (project_id);
CREATE INDEX idx_tasks_status ON public.tasks USING btree (status);

-- Permissions

ALTER TABLE public.tasks OWNER TO postgres;
GRANT ALL ON TABLE public.tasks TO postgres;

-- public.user_roles definition

-- Drop table

-- DROP TABLE public.user_roles;

CREATE TABLE public.user_roles ( user_id uuid NOT NULL, role_id uuid NOT NULL, CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id), CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE, CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE);

-- Permissions

ALTER TABLE public.user_roles OWNER TO postgres;
GRANT ALL ON TABLE public.user_roles TO postgres;

-- public.user_settings definition

-- Drop table

-- DROP TABLE public.user_settings;

CREATE TABLE public.user_settings ( user_id uuid NOT NULL, theme public."theme_enum" DEFAULT 'system'::theme_enum NOT NULL, "language" varchar(10) DEFAULT 'en'::character varying NULL, notification_email_enabled bool DEFAULT true NOT NULL, notification_inapp_enabled bool DEFAULT true NOT NULL, created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL, CONSTRAINT user_settings_pkey PRIMARY KEY (user_id), CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE);

-- Permissions

ALTER TABLE public.user_settings OWNER TO postgres;
GRANT ALL ON TABLE public.user_settings TO postgres;

-- public.file_uploads definition

-- Drop table

-- DROP TABLE public.file_uploads;

CREATE TABLE public.file_uploads ( id uuid DEFAULT uuid_generate_v4() NOT NULL, task_id uuid NULL, uploaded_by uuid NOT NULL, file_url text NOT NULL, file_name text NOT NULL, file_type text NULL, file_size int8 NULL, storage_provider text NULL, checksum text NULL, is_deleted bool DEFAULT false NOT NULL, deleted_at timestamptz NULL, uploaded_at timestamptz DEFAULT now() NOT NULL, CONSTRAINT file_uploads_pkey PRIMARY KEY (id), CONSTRAINT file_uploads_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE, CONSTRAINT file_uploads_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE SET NULL);

-- Permissions

ALTER TABLE public.file_uploads OWNER TO postgres;
GRANT ALL ON TABLE public.file_uploads TO postgres;

-- public.project_members definition

-- Drop table

-- DROP TABLE public.project_members;

CREATE TABLE public.project_members ( project_id uuid NOT NULL, user_id uuid NOT NULL, assigned_role text NULL, joined_at timestamptz DEFAULT now() NOT NULL, CONSTRAINT project_members_pkey PRIMARY KEY (project_id, user_id), CONSTRAINT project_members_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE, CONSTRAINT project_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE);

-- Permissions

ALTER TABLE public.project_members OWNER TO postgres;
GRANT ALL ON TABLE public.project_members TO postgres;

-- public.subtasks definition

-- Drop table

-- DROP TABLE public.subtasks;

CREATE TABLE public.subtasks ( id uuid DEFAULT uuid_generate_v4() NOT NULL, task_id uuid NOT NULL, title text NOT NULL, status public."task_status_enum" DEFAULT 'todo'::task_status_enum NOT NULL, assigned_to uuid NULL, "position" int4 NULL, due_date timestamptz NULL, created_by uuid NULL, is_deleted bool DEFAULT false NOT NULL, deleted_at timestamptz NULL, created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL, description text NULL, updated_by uuid NULL, CONSTRAINT subtasks_pkey PRIMARY KEY (id), CONSTRAINT subtasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL, CONSTRAINT subtasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL, CONSTRAINT subtasks_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE, CONSTRAINT subtasks_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL);

-- Permissions

ALTER TABLE public.subtasks OWNER TO postgres;
GRANT ALL ON TABLE public.subtasks TO postgres;

-- public.task_comments definition

-- Drop table

-- DROP TABLE public.task_comments;

CREATE TABLE public.task_comments ( id uuid DEFAULT uuid_generate_v4() NOT NULL, task_id uuid NOT NULL, user_id uuid NOT NULL, parent_comment_id uuid NULL, comment_text text NOT NULL, is_edited bool DEFAULT false NOT NULL, is_deleted bool DEFAULT false NOT NULL, deleted_at timestamptz NULL, created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL, CONSTRAINT task_comments_pkey PRIMARY KEY (id), CONSTRAINT task_comments_parent_comment_id_fkey FOREIGN KEY (parent_comment_id) REFERENCES public.task_comments(id) ON DELETE CASCADE, CONSTRAINT task_comments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE, CONSTRAINT task_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE);

-- Permissions

ALTER TABLE public.task_comments OWNER TO postgres;
GRANT ALL ON TABLE public.task_comments TO postgres;

-- public.task_tags definition

-- Drop table

-- DROP TABLE public.task_tags;

CREATE TABLE public.task_tags ( task_id uuid NOT NULL, tag_id uuid NOT NULL, CONSTRAINT task_tags_pkey PRIMARY KEY (task_id, tag_id), CONSTRAINT task_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE, CONSTRAINT task_tags_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE);

-- Permissions

ALTER TABLE public.task_tags OWNER TO postgres;
GRANT ALL ON TABLE public.task_tags TO postgres;

-- DROP FUNCTION public.uuid_generate_v1();

CREATE OR REPLACE FUNCTION public.uuid_generate_v1()
RETURNS uuid
LANGUAGE c
PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v1$function$
;

-- Permissions

ALTER FUNCTION public.uuid_generate_v1() OWNER TO postgres;
GRANT ALL ON FUNCTION public.uuid_generate_v1() TO postgres;

-- DROP FUNCTION public.uuid_generate_v1mc();

CREATE OR REPLACE FUNCTION public.uuid_generate_v1mc()
RETURNS uuid
LANGUAGE c
PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v1mc$function$
;

-- Permissions

ALTER FUNCTION public.uuid_generate_v1mc() OWNER TO postgres;
GRANT ALL ON FUNCTION public.uuid_generate_v1mc() TO postgres;

-- DROP FUNCTION public.uuid_generate_v3(uuid, text);

CREATE OR REPLACE FUNCTION public.uuid_generate_v3(namespace uuid, name text)
RETURNS uuid
LANGUAGE c
IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v3$function$
;

-- Permissions

ALTER FUNCTION public.uuid_generate_v3(uuid, text) OWNER TO postgres;
GRANT ALL ON FUNCTION public.uuid_generate_v3(uuid, text) TO postgres;

-- DROP FUNCTION public.uuid_generate_v4();

CREATE OR REPLACE FUNCTION public.uuid_generate_v4()
RETURNS uuid
LANGUAGE c
PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v4$function$
;

-- Permissions

ALTER FUNCTION public.uuid_generate_v4() OWNER TO postgres;
GRANT ALL ON FUNCTION public.uuid_generate_v4() TO postgres;

-- DROP FUNCTION public.uuid_generate_v5(uuid, text);

CREATE OR REPLACE FUNCTION public.uuid_generate_v5(namespace uuid, name text)
RETURNS uuid
LANGUAGE c
IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v5$function$
;

-- Permissions

ALTER FUNCTION public.uuid_generate_v5(uuid, text) OWNER TO postgres;
GRANT ALL ON FUNCTION public.uuid_generate_v5(uuid, text) TO postgres;

-- DROP FUNCTION public.uuid_nil();

CREATE OR REPLACE FUNCTION public.uuid_nil()
RETURNS uuid
LANGUAGE c
IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_nil$function$
;

-- Permissions

ALTER FUNCTION public.uuid_nil() OWNER TO postgres;
GRANT ALL ON FUNCTION public.uuid_nil() TO postgres;

-- DROP FUNCTION public.uuid_ns_dns();

CREATE OR REPLACE FUNCTION public.uuid_ns_dns()
RETURNS uuid
LANGUAGE c
IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_ns_dns$function$
;

-- Permissions

ALTER FUNCTION public.uuid_ns_dns() OWNER TO postgres;
GRANT ALL ON FUNCTION public.uuid_ns_dns() TO postgres;

-- DROP FUNCTION public.uuid_ns_oid();

CREATE OR REPLACE FUNCTION public.uuid_ns_oid()
RETURNS uuid
LANGUAGE c
IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_ns_oid$function$
;

-- Permissions

ALTER FUNCTION public.uuid_ns_oid() OWNER TO postgres;
GRANT ALL ON FUNCTION public.uuid_ns_oid() TO postgres;

-- DROP FUNCTION public.uuid_ns_url();

CREATE OR REPLACE FUNCTION public.uuid_ns_url()
RETURNS uuid
LANGUAGE c
IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_ns_url$function$
;

-- Permissions

ALTER FUNCTION public.uuid_ns_url() OWNER TO postgres;
GRANT ALL ON FUNCTION public.uuid_ns_url() TO postgres;

-- DROP FUNCTION public.uuid_ns_x500();

CREATE OR REPLACE FUNCTION public.uuid_ns_x500()
RETURNS uuid
LANGUAGE c
IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_ns_x500$function$
;

-- Permissions

ALTER FUNCTION public.uuid_ns_x500() OWNER TO postgres;
GRANT ALL ON FUNCTION public.uuid_ns_x500() TO postgres;

-- Permissions

GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO pg_database_owner;
GRANT USAGE ON SCHEMA public TO public;

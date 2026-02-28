# Role-based Project Task Management Platform

A scalable, enterprise-ready project and task management system built with PostgreSQL, featuring Role-Based Access Control (RBAC), JWT authentication, activity logs, notifications, and audit-ready architecture.

## 🚀 Features

- **Role-Based Access Control (RBAC)** - Granular permission management with customizable roles
- **JWT Authentication** - Secure, token-based user authentication
- **Project Management** - Create, organize, and manage projects with team members
- **Task Management** - Create, assign, and track tasks with subtasks and tags
- **Activity Logs** - Comprehensive audit trail of all system actions
- **Notifications** - Real-time notifications for task updates and assignments
- **Task Comments** - Collaborate with team members through task comments
- **File Attachments** - Upload and attach files to tasks
- **User Management** - Admin controls for user creation and management
- **Scalable Architecture** - Built for high-performance, multi-tenant applications

## 🛠️ Tech Stack

### Backend

- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT with Passport.js
- **Validation**: Class Validator & Transformer
- **Testing**: Jest with E2E specs
- **Code Quality**: ESLint

### Frontend

- **Framework**: Angular (TypeScript)
- **Build Tool**: Angular CLI
- **Styling**: SCSS
- **Package Manager**: npm

## 📁 Project Structure

```
├── backend/                          # NestJS API server
│   ├── src/
│   │   ├── activity-logs/           # Activity logging module
│   │   ├── admin/                   # Admin management module
│   │   ├── auth/                    # Authentication & authorization
│   │   ├── clients/                 # Client management
│   │   ├── common/                  # Shared utilities, guards, interceptors
│   │   ├── mail/                    # Email service
│   │   ├── notifications/           # Notification system
│   │   ├── permissions/             # Permission management
│   │   ├── project-members/         # Project membership
│   │   ├── projects/                # Project module
│   │   ├── roles/                   # Role definitions
│   │   ├── tasks/                   # Task management
│   │   ├── task-comments/           # Task comments
│   │   ├── task-files/              # Task file attachments
│   │   ├── task-tags/               # Task tagging
│   │   ├── users/                   # User management
│   │   ├── app.module.ts            # Root module
│   │   ├── main.ts                  # Application entry point
│   │   └── data-source.ts           # Database connection config
│   ├── migrations/                  # Database migrations
│   ├── test/                        # E2E tests
│   └── package.json
│
└── frontend/                         # Angular application
    ├── src/
    │   ├── app/                     # App routing & shell
    │   ├── core/                    # Core services & providers
    │   ├── features/                # Feature modules
    │   ├── layouts/                 # Layout components
    │   ├── environments/            # Environment configs
    │   ├── styles.scss              # Global styles
    │   ├── main.ts                  # Application bootstrap
    │   └── index.html
    ├── angular.json
    └── package.json
```

## ⚙️ Installation & Setup

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 12+
- Git

### Backend Setup

1. Navigate to the backend directory:

   ```bash
   cd backend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure environment variables:

   ```bash
   cp .env.example .env
   # Edit .env with your database and app configuration
   ```

4. Run database migrations:

   ```bash
   npm run typeorm migration:run
   ```

5. Start the development server:
   ```bash
   npm run start:dev
   ```

The API will be available at `http://localhost:3000`

### Frontend Setup

1. Navigate to the frontend directory:

   ```bash
   cd frontend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure environment variables (if needed):

   ```bash
   # Update src/environments/environment.ts with your API endpoint
   ```

4. Start the development server:
   ```bash
   ng serve
   # or
   npm start
   ```

The application will be available at `http://localhost:4200`

## 📚 API Documentation

Once the backend is running, you can access:

- **Swagger API Docs**: http://localhost:3000/api/docs

## 🔐 Authentication

The system uses JWT-based authentication:

1. **Login** - POST `/auth/login` with credentials
2. **Token Storage** - Store the JWT in localStorage or sessionStorage
3. **Authorization** - Include token in the `Authorization: Bearer <token>` header
4. **Refresh** - Use refresh tokens to obtain new access tokens

## 🧪 Testing

### Backend Tests

```bash
cd backend
npm run test              # Run unit tests
npm run test:e2e         # Run E2E tests
npm run test:cov         # Generate coverage report
```

### Frontend Tests

```bash
cd frontend
npm run test             # Run unit tests
npm run e2e              # Run E2E tests
```

## 🚢 Deployment

### Build for Production

**Backend:**

```bash
cd backend
npm run build
npm run start:prod
```

**Frontend:**

```bash
cd frontend
ng build --configuration production
```

## 📝 Git Workflow

- **Main branch**: Production-ready code
- **Development branch**: Development and testing
- **Feature branches**: `feature/<feature-name>` for new features
- **Bugfix branches**: `bugfix/<bug-name>` for bug fixes

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/<feature-name>`
2. Commit your changes: `git commit -m "feat: description"`
3. Push to branch: `git push origin feature/<feature-name>`
4. Open a Pull Request

### Commit Message Convention

- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `refactor:` for code refactoring
- `test:` for test additions
- `chore:` for build/config changes

## 📄 License

This project is proprietary and confidential.

## 📞 Support

For issues, questions, or suggestions, please contact the development team or create an issue in the repository.

## 🔄 Recent Updates

Refer to [SETUP_COMPLETE.md](./SETUP_COMPLETE.md) for recent setup and configuration details.

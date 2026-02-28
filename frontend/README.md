# Planquo - Project Management System

A modern, role-based Angular 20 Project Management System with dark theme UI, built with Angular Material and TypeScript.

## Features

✅ **Role-Based Authentication**

- JWT-based authentication
- Admin and User roles
- Permission-based access control
- Separate dashboards for different roles

✅ **Modern Dark Theme UI**

- Premium dark theme design
- Responsive layouts
- Material Design components
- Smooth animations and transitions

✅ **State Management**

- Angular Signals for reactive state
- No external state management library needed
- Type-safe and performant

✅ **Professional Architecture**

- Modular folder structure
- Lazy loading for better performance
- HTTP interceptors for auth and error handling
- Route guards for security

## Project Structure

```
src/
├── app/
│   ├── app.config.ts              # Application configuration
│   ├── app.routes.ts              # Entry routes with shell + auth
│   ├── routes/
│   │   └── app-shell.routes.ts    # Child routes rendered inside the main layout
│   └── app.ts                     # Root component
├── core/                      # Singleton services and guards
│   ├── guards/
│   │   ├── auth.guard.ts      # Authentication guard
│   │   └── role.guard.ts      # Role-based guard
│   ├── interceptors/
│   │   ├── auth.interceptor.ts    # JWT token interceptor
│   │   └── error.interceptor.ts   # Global error handler
│   ├── models/
│   │   └── index.ts           # TypeScript interfaces
│   └── services/
│       └── auth.service.ts    # Authentication service with signals
├── features/                  # Feature modules
│   ├── auth/
│   │   ├── auth.routes.ts
│   │   └── ui/
│   │       └── login/
│   │           └── login.component.ts
│   ├── dashboard/
│   │   └── ui/
│   │       └── user-dashboard/
│   │           └── user-dashboard.component.ts
│   ├── admin/
│   │   ├── admin.routes.ts
│   │   └── ui/
│   │       └── admin-dashboard/
│   │           └── admin-dashboard.component.ts
│   ├── projects/
│   │   ├── projects.routes.ts
│   │   ├── data-access/
│   │   │   └── projects.service.ts
│   │   └── ui/
│   │       ├── all-projects/
│   │       ├── project-detail/
│   │       └── project-form/
│   ├── profile/
│   │   ├── profile.routes.ts
│   │   └── components/
│   │       ├── profile/
│   │       ├── edit-profile/
│   │       ├── change-password/
│   │       └── profile-picture/
│   └── tasks/
│       └── tasks.routes.ts
├── layouts/                   # Layout components
│   └── main-layout/
│       ├── main-layout.component.ts
│       ├── main-layout.component.html
│       └── main-layout.component.scss
├── environments/              # Environment configs
│   ├── environment.ts
│   └── environment.prod.ts
└── styles.scss               # Global styles
```

### Path Aliases

Configured in `tsconfig.json` for cleaner imports:

- `@app/*` → `src/app/*`
- `@core/*` → `src/core/*`
- `@features/*` → `src/features/*`
- `@layouts/*` → `src/layouts/*`
- `@environments/*` → `src/environments/*`

## Getting Started

### Prerequisites

- Node.js 18 or higher
- Angular CLI 20.x
- npm or yarn

### Installation

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Start the development server**

   ```bash
   npm start
   ```

3. **Open browser**
   Navigate to `http://localhost:4200`

### Backend Setup

Make sure your NestJS backend is running on `http://localhost:3000`

## Demo Credentials

**Admin User:**

- Email: `admin@example.com`
- Password: `Admin@@##123`

**Regular User:**

- Email: `user@example.com`
- Password: `User@@##123`

## Key Technologies

- **Angular 20** - Latest Angular framework
- **Angular Material** - UI component library
- **TypeScript** - Type-safe development
- **SCSS** - Styling with variables and mixins
- **RxJS** - Reactive programming
- **Signals** - Angular's reactive primitives

## Features Implementation

### Authentication

- Login with email/password
- JWT token management
- Auto-redirect based on user role
- Session persistence with localStorage

### Authorization

- Route guards (authGuard, roleGuard)
- Role-based navigation
- Permission checking service
- Dynamic menu based on roles

### UI Components

- Collapsible sidebar navigation
- Top header with search and notifications
- Stats cards with icons
- Data tables with sorting and filtering
- Activity timeline
- User profile dropdown
- Responsive design for mobile/tablet

### State Management with Signals

```typescript
// Read-only signals
currentUser = this._currentUser.asReadonly();
isAuthenticated = this._isAuthenticated.asReadonly();

// Computed signals
isAdmin = computed(() => this.userRoles().includes('admin'));
userFullName = computed(() => {
  const user = this._currentUser();
  return user ? `${user.firstName} ${user.lastName}` : '';
});
```

## API Integration

The frontend connects to the backend API at:

- Development: `http://localhost:3000`
- Production: Update in `environment.prod.ts`

### Available Endpoints

- `POST /auth/login` - User authentication
- `GET /users/me` - Get current user
- `GET /admin/users` - List all users (admin only)
- `GET /admin/roles` - List all roles (admin only)
- And more...

## Building for Production

```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.

## Development Guidelines

### Adding New Features

1. Create feature module in `src/features/`
2. Add routes in feature's `.routes.ts` file
3. Update main routes if needed
4. Create components as standalone
5. Use signals for state management

### Adding New API Calls

1. Define interfaces in `core/models/`
2. Create service in feature's services folder
3. Use AuthService signals for reactive updates

### Styling Guidelines

- Use CSS variables from `styles.scss`
- Follow dark theme color palette
- Use utility classes for common patterns
- Maintain 8px spacing grid

## Troubleshooting

**Issue: API calls failing**

- Check backend is running on port 3000
- Verify CORS is enabled in backend
- Check browser console for errors

**Issue: Login not working**

- Verify backend credentials match
- Check network tab for API response
- Clear localStorage and try again

## Next Steps

- [ ] Implement project CRUD operations
- [ ] Add task management features
- [ ] Create user management admin panel
- [ ] Add role and permission management
- [ ] Implement notifications system
- [ ] Add file upload functionality
- [ ] Create analytics dashboards
- [ ] Add dark/light theme toggle

## License

Private project for learning purposes.

## Support

For issues or questions, please create an issue in the repository.

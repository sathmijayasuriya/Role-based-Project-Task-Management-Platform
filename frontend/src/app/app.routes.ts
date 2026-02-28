import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth.guard';
import { APP_SHELL_ROUTES } from './routes/app-shell.routes';
import { authRoutes } from '@features/auth/auth.routes';

export const routes: Routes = [
  ...authRoutes,
  {
    path: '',
    loadComponent: () =>
      import('@layouts/main-layout/main-layout.component').then((m) => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: APP_SHELL_ROUTES,
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];

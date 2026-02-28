import { Routes } from '@angular/router';
import { roleGuard } from '@core/guards/role.guard';

export default [
  {
    path: '',
    canActivate: [roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () =>
      import('./ui/team-list/team-list.component').then((m) => m.TeamListComponent),
  },
  {
    path: 'create',
    canActivate: [roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () =>
      import('./ui/team-list/team-list.component').then((m) => m.TeamListComponent),
  },
] as Routes;

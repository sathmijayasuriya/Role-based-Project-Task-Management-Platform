import { Routes } from '@angular/router';

export default [
  {
    path: '',
    loadComponent: () =>
      import('@features/team/ui/team-list/team-list.component').then((m) => m.TeamListComponent),
  },
  {
    path: 'notifications/create',
    loadComponent: () =>
      import('@features/notifications/ui/notification-composer/notification-composer.component').then(
        (m) => m.NotificationComposerComponent,
      ),
  },
  {
    path: 'create',
    loadComponent: () =>
      import('@features/team/ui/team-list/team-list.component').then((m) => m.TeamListComponent),
  },
] as Routes;

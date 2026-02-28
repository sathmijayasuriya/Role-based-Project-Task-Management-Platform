import { Routes } from '@angular/router';

export default [
  {
    path: '',
    loadComponent: () =>
      import('./ui/tasks-page/tasks-page.component').then(
        (m) => m.TasksPageComponent
      ),
  },
] as Routes;

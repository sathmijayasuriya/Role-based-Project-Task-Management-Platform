import { Routes } from '@angular/router';

export default [
  {
    path: '',
    loadComponent: () =>
      import('./ui/all-projects/all-projects.component').then((m) => m.AllProjectsComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./ui/project-detail/project-detail.component').then((m) => m.ProjectDetailComponent),
  },
] as Routes;

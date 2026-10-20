import { inject } from '@angular/core';
import { Route } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guard';
import { AuthService } from './core/services/auth.service';
import { ROLES_PERSONAL } from './core/models/rol-cierre.model';

export const appRoutes: Route[] = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'sin-acceso',
    loadComponent: () => import('./features/sin-acceso/sin-acceso.component').then(m => m.SinAccesoComponent),
    canActivate: [authGuard]
  },
  {
    path: '',
    loadComponent: () => import('./layout/app-shell/app-shell.component').then(m => m.AppShellComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'bandeja',
        loadComponent: () => import('./features/bandeja/bandeja.component').then(m => m.BandejaComponent),
        canActivate: [roleGuard(ROLES_PERSONAL)]
      },
      {
        path: 'mi-cierre',
        loadComponent: () => import('./features/mi-cierre/mi-cierre.component').then(m => m.MiCierreComponent),
        canActivate: [roleGuard(['OA'])]
      },
      {
        path: 'evaluaciones-impacto',
        loadComponent: () =>
          import('./features/evaluaciones-impacto/evaluaciones-impacto.component').then(m => m.EvaluacionesImpactoComponent),
        canActivate: [roleGuard(['USE', 'ADMIN'])]
      },
      {
        path: 'administracion',
        loadComponent: () => import('./features/administracion/administracion.component').then(m => m.AdministracionComponent),
        canActivate: [roleGuard(['ADMIN'])]
      },
      {
        // Personal y OA: la API decide si el usuario puede ver ese expediente (la OA, solo el suyo).
        path: 'expedientes/:id',
        loadComponent: () => import('./features/expediente/expediente.component').then(m => m.ExpedienteComponent),
        canActivate: [roleGuard([...ROLES_PERSONAL, 'OA'])]
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: () => inject(AuthService).inicio()
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];

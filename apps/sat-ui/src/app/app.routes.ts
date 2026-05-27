import { Route } from '@angular/router';
import { LoginComponent } from './features/login/login.component';
import { AppLayoutComponent } from './layout/app-layout/app-layout.component';
import { authGuard } from './core/guards/auth.guard';

export const appRoutes: Route[] = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: AppLayoutComponent,
    canActivate: [authGuard],
    children: [
      { 
        path: 'dashboard', 
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent), 
        data: { expectedRoles: ['ADMINISTRADOR'] } 
      },
      { 
        path: 'asignaciones', 
        loadComponent: () => import('./features/asignaciones/asignaciones.component').then(m => m.AsignacionesComponent), 
        data: { expectedRoles: ['ADMINISTRADOR'] } 
      },
      { 
        path: 'asistentes', 
        loadComponent: () => import('./features/asistentes/asistentes.component').then(m => m.AsistentesComponent), 
        data: { expectedRoles: ['ADMINISTRADOR'] } 
      },
      { 
        path: 'organizaciones', 
        loadComponent: () => import('./features/organizaciones/organizaciones.component').then(m => m.OrganizacionesComponent), 
        data: { expectedRoles: ['ADMINISTRADOR'] } 
      },
      { 
        path: 'programaciones', 
        loadComponent: () => import('./features/programaciones/programaciones.component').then(m => m.ProgramacionesComponent),
        data: { expectedRoles: ['TECNICO'] } 
      },
      { 
        path: 'evidencias', 
        loadComponent: () => import('./features/evidencias/evidencias.component').then(m => m.EvidenciasComponent), 
        data: { expectedRoles: ['ADMINISTRADOR', 'TECNICO'] } 
      },
      { 
        path: 'informes', 
        loadComponent: () => import('./features/informes/informes.component').then(m => m.InformesComponent), 
        data: { expectedRoles: ['ADMINISTRADOR', 'TECNICO'] } 
      },
      { 
        path: 'sincronizacion', 
        loadComponent: () => import('./features/sincronizacion/sincronizacion.component').then(m => m.SincronizacionComponent), 
        data: { expectedRoles: ['ADMINISTRADOR', 'TECNICO'] } 
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: 'login' }
];

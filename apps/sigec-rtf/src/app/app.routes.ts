import { Route } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guard';

export const appRoutes: Route[] = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    loadComponent: () => import('./layout/app-shell/app-shell.component').then(m => m.AppShellComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'rtf/dashboard',
        loadComponent: () => import('./features/oa-dashboard/oa-dashboard.component').then(m => m.OaDashboardComponent),
        canActivate: [roleGuard(['POSTULANTE'])]
      },
      {
        path: 'rtf/pasos-criticos/registrar',
        loadComponent: () => import('./features/oa-registro/oa-registro.component').then(m => m.OaRegistroComponent),
        canActivate: [roleGuard(['POSTULANTE'])]
      },
      {
        path: 'rtf/pasos-criticos/:idpc/registrar',
        loadComponent: () => import('./features/oa-registro/oa-registro.component').then(m => m.OaRegistroComponent),
        canActivate: [roleGuard(['POSTULANTE'])]
      },
      {
        path: 'rtf/pasos-criticos/enviar',
        loadComponent: () => import('./features/oa-enviar/oa-enviar.component').then(m => m.OaEnviarComponent),
        canActivate: [roleGuard(['POSTULANTE'])]
      },
      {
        path: 'rtf/pasos-criticos/observaciones',
        loadComponent: () => import('./features/oa-observaciones/oa-observaciones.component').then(m => m.OaObservacionesComponent),
        canActivate: [roleGuard(['POSTULANTE'])]
      },
      {
        path: 'rtf/reportes/metas-fisicas',
        loadComponent: () => import('./features/reportes/reporte-fisico.component').then(m => m.ReporteFisicoComponent),
        canActivate: [roleGuard(['POSTULANTE'])]
      },
      {
        path: 'rtf/reportes/metas-financieras',
        loadComponent: () => import('./features/reportes/reporte-financiero.component').then(m => m.ReporteFinancieroComponent),
        canActivate: [roleGuard(['POSTULANTE'])]
      },
      {
        path: 'rtf/bandeja',
        loadComponent: () => import('./features/bandeja-oa/bandeja-oa.component').then(m => m.BandejaOAComponent),
        canActivate: [roleGuard(['POSTULANTE'])]
      },
      {
        // ADR-010: no existe un actor "UR" separado — la verificación de campo (Anexo 19) es una
        // sección más dentro de esta misma pantalla, para el mismo especialista UN.
        path: 'rtf/evaluacion-gabinete',
        loadComponent: () => import('./features/un-gabinete/un-gabinete.component').then(m => m.UnGabineteComponent),
        canActivate: [roleGuard(['UN', 'DE', 'UAJ', 'USE'])]
      },
      {
        path: 'rtf/dashboard-un',
        loadComponent: () => import('./features/un-dashboard/un-dashboard.component').then(m => m.UnDashboardComponent),
        canActivate: [roleGuard(['UN', 'DE', 'UAJ', 'USE'])]
      },
      {
        path: '',
        redirectTo: 'rtf/dashboard',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];

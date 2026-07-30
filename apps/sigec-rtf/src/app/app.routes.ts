import { Route } from '@angular/router';
import { LoginComponent } from './features/login/login.component';
import { AppShellComponent } from './layout/app-shell/app-shell.component';
import { OaDashboardComponent } from './features/oa-dashboard/oa-dashboard.component';
import { OaRegistroComponent } from './features/oa-registro/oa-registro.component';
import { OaEnviarComponent } from './features/oa-enviar/oa-enviar.component';
import { OaObservacionesComponent } from './features/oa-observaciones/oa-observaciones.component';
import { ReporteFisicoComponent } from './features/reportes/reporte-fisico.component';
import { ReporteFinancieroComponent } from './features/reportes/reporte-financiero.component';
import { UrAuditoriaComponent } from './features/ur-auditoria/ur-auditoria.component';
import { UnGabineteComponent } from './features/un-gabinete/un-gabinete.component';
import { BandejaOAComponent } from './features/bandeja-oa/bandeja-oa.component';
import { UnDashboardComponent } from './features/un-dashboard/un-dashboard.component';
import { authGuard, roleGuard } from './core/guards/auth.guard';

export const appRoutes: Route[] = [
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: '',
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'rtf/dashboard',
        component: OaDashboardComponent,
        canActivate: [roleGuard(['POSTULANTE'])]
      },
      {
        path: 'rtf/pasos-criticos/registrar',
        component: OaRegistroComponent,
        canActivate: [roleGuard(['POSTULANTE'])]
      },
      {
        path: 'rtf/pasos-criticos/:idpc/registrar',
        component: OaRegistroComponent,
        canActivate: [roleGuard(['POSTULANTE'])]
      },
      {
        path: 'rtf/pasos-criticos/enviar',
        component: OaEnviarComponent,
        canActivate: [roleGuard(['POSTULANTE'])]
      },
      {
        path: 'rtf/pasos-criticos/observaciones',
        component: OaObservacionesComponent,
        canActivate: [roleGuard(['POSTULANTE'])]
      },
      {
        path: 'rtf/reportes/metas-fisicas',
        component: ReporteFisicoComponent,
        canActivate: [roleGuard(['POSTULANTE'])]
      },
      {
        path: 'rtf/reportes/metas-financieras',
        component: ReporteFinancieroComponent,
        canActivate: [roleGuard(['POSTULANTE'])]
      },
      {
        path: 'rtf/bandeja',
        component: BandejaOAComponent,
        canActivate: [roleGuard(['POSTULANTE'])]
      },
      {
        path: 'rtf/auditoria-regional',
        component: UrAuditoriaComponent,
        canActivate: [roleGuard(['UR'])]
      },
      {
        path: 'rtf/evaluacion-gabinete',
        component: UnGabineteComponent,
        canActivate: [roleGuard(['UN', 'DE', 'UAJ', 'USE'])]
      },
      {
        path: 'rtf/dashboard-un',
        component: UnDashboardComponent,
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

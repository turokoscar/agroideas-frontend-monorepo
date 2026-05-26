import { Route } from '@angular/router';
import { LoginComponent } from './features/login/login.component';
import { AppLayoutComponent } from './layout/app-layout/app-layout.component';
import { authGuard } from './core/guards/auth.guard';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { AsignacionesComponent } from './features/asignaciones/asignaciones.component';
import { AsistentesComponent } from './features/asistentes/asistentes.component';
import { OrganizacionesComponent } from './features/organizaciones/organizaciones.component';
import { EvidenciasComponent } from './features/evidencias/evidencias.component';
import { InformesComponent } from './features/informes/informes.component';
import { SincronizacionComponent } from './features/sincronizacion/sincronizacion.component';

export const appRoutes: Route[] = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: AppLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'asignaciones', component: AsignacionesComponent },
      { path: 'asistentes', component: AsistentesComponent },
      { path: 'organizaciones', component: OrganizacionesComponent },
      { path: 'evidencias', component: EvidenciasComponent },
      { path: 'informes', component: InformesComponent },
      { path: 'sincronizacion', component: SincronizacionComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: 'login' }
];



import { Route } from '@angular/router';
import { LoginComponent } from './features/login/login.component';
import { AppShellComponent } from './layout/app-shell/app-shell.component';
import { OaRegistroComponent } from './features/oa-registro/oa-registro.component';
import { UrAuditoriaComponent } from './features/ur-auditoria/ur-auditoria.component';
import { UnGabineteComponent } from './features/un-gabinete/un-gabinete.component';
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
        path: 'rtf/registrar',
        component: OaRegistroComponent,
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
        path: '',
        redirectTo: 'rtf/registrar',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];

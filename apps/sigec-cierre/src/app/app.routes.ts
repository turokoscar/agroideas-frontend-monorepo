import { Route } from '@angular/router';
import { LoginComponent } from './features/login/login.component';
import { AppShellComponent } from './layout/app-shell/app-shell.component';
import { CierreRegistroComponent } from './features/cierre-registro/cierre-registro.component';
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
        path: 'cierre/registrar',
        component: CierreRegistroComponent,
        canActivate: [roleGuard(['POSTULANTE'])]
      },
      {
        path: '',
        redirectTo: 'cierre/registrar',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];

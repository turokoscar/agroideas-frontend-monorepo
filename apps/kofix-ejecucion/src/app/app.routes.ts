import { PERMISSIONS } from '@agroideas/utils';
import { Routes } from '@angular/router';
import { LoginPageComponent } from './presentation/pages/login/login.page';
import { inject } from '@angular/core';
import { AuthRepository } from './domain/repositories/auth.repository';
import { Router } from '@angular/router';
import { AppLayoutComponent } from './layout/app.layout.component';
import { permissionGuard } from '@agroideas/security';

const authGuard = () => {
    const authRepo = inject(AuthRepository);
    const router = inject(Router);
    if (authRepo.isAuthenticated()) {
        return true;
    }
    router.navigate(['/login']);
    return false;
};

export const routes: Routes = [
    { path: 'login', component: LoginPageComponent },
    { path: '', redirectTo: '/login', pathMatch: 'full' },
    {
        path: 'main',
        component: AppLayoutComponent,
        canActivate: [authGuard, permissionGuard],
        data: { permission: PERMISSIONS.ACCESO_APP },
        children: [
            { path: '', redirectTo: 'home', pathMatch: 'full' },
            {
                path: 'home',
                loadComponent: () => import('./presentation/pages/home/home.component').then(m => m.HomeComponent)
            },
            {
                path: 'styleguide',
                loadComponent: () => import('./presentation/pages/styleguide/styleguide.page').then(m => m.StyleguidePageComponent)
            },
            {
                path: 'convenios',
                canActivate: [permissionGuard],
                data: { permission: PERMISSIONS.ACCESO_APP },
                loadComponent: () => import('./presentation/pages/convenio-list/convenio-list.page').then(m => m.ConvenioListPageComponent)
            },
            {
                path: 'convenios/:id',
                canActivate: [permissionGuard],
                data: { permission: PERMISSIONS.ACCESO_APP },
                loadComponent: () => import('./presentation/pages/convenio-detail/convenio-detail.page').then(m => m.ConvenioDetailPageComponent)
            },
            {
                path: 'cartera',
                canActivate: [permissionGuard],
                data: { permission: PERMISSIONS.GESTION_CARTERA },
                loadComponent: () => import('./presentation/pages/cartera/cartera.page').then(m => m.CarteraPageComponent)
            },
            {
                path: 'programacion',
                canActivate: [permissionGuard],
                data: { permission: PERMISSIONS.REGISTRO_PROGRAMACION },
                loadComponent: () => import('./presentation/pages/programacion/programacion.page').then(m => m.ProgramacionPageComponent)
            },
            {
                path: 'programacion-vigente',
                canActivate: [permissionGuard],
                data: { permission: PERMISSIONS.ACCESO_APP },
                loadComponent: () => import('./presentation/pages/programacion-vigente/programacion-vigente.page').then(m => m.ProgramacionVigentePageComponent)
            },
            {
                path: 'alertas',
                canActivate: [permissionGuard],
                data: { permission: PERMISSIONS.MONITOREO_ALERTAS },
                loadComponent: () => import('./presentation/pages/alertas/alertas.page').then(m => m.AlertasPageComponent)
            },
            {
                path: 'kardex',
                canActivate: [permissionGuard],
                data: { permission: PERMISSIONS.ACCESO_KARDEX },
                loadComponent: () => import('./presentation/pages/kardex/kardex.page').then(m => m.KardexPageComponent)
            },
            {
                path: 'bandeja-aprobacion',
                canActivate: [permissionGuard],
                data: { permission: PERMISSIONS.MONITOREO_ALERTAS },
                loadComponent: () => import('./presentation/pages/bandeja-aprobacion/bandeja-aprobacion.page').then(m => m.BandejaAprobacionPageComponent)
            },
            {
                path: 'reportes',
                canActivate: [permissionGuard],
                data: { permission: PERMISSIONS.ACCESO_APP },
                loadComponent: () => import('./presentation/pages/reportes/reportes.page').then(m => m.ReportesPageComponent)
            },
            {
                path: 'gestion-menus',
                canActivate: [permissionGuard],
                data: { permission: PERMISSIONS.GESTION_CARTERA },
                loadComponent: () => import('./presentation/pages/gestion-menus/gestion-menus.page').then(m => m.GestionMenusPageComponent)
            },
            {
                path: 'no-objeciones',
                canActivate: [permissionGuard],
                data: { permission: PERMISSIONS.ACCESO_APP },
                loadComponent: () => import('./presentation/pages/no-objecion/no-objecion.page').then(m => m.NoObjecionPageComponent)
            },
            {
                path: 'desembolsos',
                canActivate: [permissionGuard],
                data: { permission: PERMISSIONS.ACCESO_APP },
                loadComponent: () => import('./presentation/pages/desembolso/desembolso.page').then(m => m.DesembolsoPageComponent)
            },
            {
                path: 'rendiciones',
                canActivate: [permissionGuard],
                data: { permission: PERMISSIONS.ACCESO_APP },
                loadComponent: () => import('./presentation/pages/rendicion/rendicion.page').then(m => m.RendicionPageComponent)
            },
            {
                path: 'convenios/:id/gastos-f1',
                canActivate: [permissionGuard],
                data: { permission: PERMISSIONS.ACCESO_APP },
                loadComponent: () => import('./presentation/pages/gastos-f1/gastos-f1.page').then(m => m.GastosF1PageComponent)
            },
            { path: '**', redirectTo: 'home' }
        ]
    },
    { path: 'dashboard', redirectTo: 'main', pathMatch: 'full' } // Redirección por compatibilidad
];

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermissionService, USER_PERMISSIONS_PROVIDER } from './permission.service';
import { AlertService } from '@agroideas/feedback';

export const permissionGuard: CanActivateFn = (route) => {
    const permissionService = inject(PermissionService);
    const provider = inject(USER_PERMISSIONS_PROVIDER);
    const router = inject(Router);
    const alertService = inject(AlertService);

    const requiredPermission = route.data['permission'] as string;

    if (!requiredPermission) {
        return true;
    }

    if (provider.initialized$ && !provider.initialized$()) {
        alertService.show('Error', 'Los permisos aún se están cargando. Recargue la página.', 'error');
        router.navigate(['/login']);
        return false;
    }

    if (permissionService.hasPermission(requiredPermission)) {
        return true;
    }

    alertService.show('Acceso Denegado', 'No cuenta con los permisos necesarios para acceder a esta sección.', 'warning');

    if (requiredPermission === 'ACCESO_APP') {
        router.navigate(['/login']);
    } else {
        router.navigate(['/main/home']);
    }

    return false;
};

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermissionService } from '../shared/services/permission.service';
import { AlertService } from '../shared/services/alert.service';
import { AuthRepository } from '../domain/repositories/auth.repository';

export const permissionGuard: CanActivateFn = (route, state) => {
  const permissionService = inject(PermissionService);
  const authRepo = inject(AuthRepository);
  const router = inject(Router);
  const alertService = inject(AlertService);

  const requiredPermission = route.data['permission'] as string;

  if (!requiredPermission) {
    return true;
  }

  if (!authRepo.permissionsInitialized$()) {
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

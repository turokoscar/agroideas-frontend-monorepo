import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AlertService } from '@agroideas/feedback';
import { map } from 'rxjs';
import { MenuStateService } from '../services/menu-state.service';

/**
 * Permite la ruta solo si su menú está asignado a algún rol del usuario en el generador de menús
 * (ADR-028). La ruta del menú se declara en `data.menu` (p. ej. '/main/reportes'); la API aplica la
 * misma regla con [RequiereMenu], así que esto evita además que se abra la página por URL.
 */
export const menuGuard: CanActivateFn = (route) => {
    const ruta = route.data['menu'] as string | undefined;
    if (!ruta) {
        return true;
    }
    const menuState = inject(MenuStateService);
    const router = inject(Router);
    const alertService = inject(AlertService);

    return menuState.tieneRuta$(ruta).pipe(
        map(tiene => {
            if (tiene) return true;
            alertService.show('Acceso Denegado', 'Su rol no tiene asignada esta opción del menú.', 'warning');
            return router.createUrlTree(['/main/home']);
        })
    );
};

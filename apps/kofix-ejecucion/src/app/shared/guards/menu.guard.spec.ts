import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { AlertService } from '@agroideas/feedback';
import { Observable, firstValueFrom, isObservable, of } from 'rxjs';
import { menuGuard } from './menu.guard';
import { MenuStateService } from '../services/menu-state.service';

describe('menuGuard', () => {
    let tieneRuta$: jest.Mock;
    let alert: { show: jest.Mock };

    const ejecutar = async (data: Record<string, unknown>) => {
        const route = { data } as unknown as ActivatedRouteSnapshot;
        const resultado = TestBed.runInInjectionContext(() => menuGuard(route, {} as RouterStateSnapshot));
        return isObservable(resultado) ? firstValueFrom(resultado as Observable<boolean | UrlTree>) : resultado;
    };

    beforeEach(() => {
        tieneRuta$ = jest.fn();
        alert = { show: jest.fn() };
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                { provide: MenuStateService, useValue: { tieneRuta$ } },
                { provide: AlertService, useValue: alert }
            ]
        });
    });

    it('deja pasar las rutas sin menú declarado', async () => {
        expect(await ejecutar({})).toBe(true);
        expect(tieneRuta$).not.toHaveBeenCalled();
    });

    it('deja pasar si el rol tiene asignado el menú', async () => {
        tieneRuta$.mockReturnValue(of(true));

        expect(await ejecutar({ menu: '/main/reportes' })).toBe(true);
        expect(tieneRuta$).toHaveBeenCalledWith('/main/reportes');
    });

    it('sin el menú avisa y redirige al home (también si se escribe la URL)', async () => {
        tieneRuta$.mockReturnValue(of(false));

        const resultado = await ejecutar({ menu: '/main/reportes' });

        expect(resultado).toBeInstanceOf(UrlTree);
        expect(TestBed.inject(Router).serializeUrl(resultado as UrlTree)).toBe('/main/home');
        expect(alert.show).toHaveBeenCalledWith('Acceso Denegado', expect.any(String), 'warning');
    });
});

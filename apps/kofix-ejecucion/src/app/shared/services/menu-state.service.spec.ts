import { TestBed } from '@angular/core/testing';
import { STORAGE_KEYS } from '@agroideas/utils';
import { of, throwError } from 'rxjs';
import { MenuStateService, normalizarRuta } from './menu-state.service';
import { MenuRepository } from '../../domain/repositories/menu.repository';
import { MenuAgrupado } from '../../domain/models/menu/menu.model';

describe('MenuStateService', () => {
    let service: MenuStateService;
    let getMenus: jest.Mock;

    const menus: MenuAgrupado[] = [
        { id: 1, nombre: 'Home', ruta: '/main/home', orden: 1, hijos: [] },
        { id: 4, nombre: 'Herramientas', orden: 2, hijos: [{ id: 16, nombre: 'Reportes', ruta: '/main/reportes/', orden: 1 }] }
    ];

    beforeEach(() => {
        localStorage.setItem(STORAGE_KEYS.TOKEN, 'token-a');
        getMenus = jest.fn().mockReturnValue(of(menus));
        TestBed.configureTestingModule({ providers: [{ provide: MenuRepository, useValue: { getMenus } }] });
        service = TestBed.inject(MenuStateService);
    });

    afterEach(() => localStorage.removeItem(STORAGE_KEYS.TOKEN));

    it('normaliza rutas: sin barra final y sin distinguir mayúsculas', () => {
        expect(normalizarRuta(' /MAIN/Reportes/ ')).toBe('/main/reportes');
    });

    it('carga los menús una sola vez y reconoce las rutas de menús y submenús', () => {
        service.asegurarCargados().subscribe();
        service.asegurarCargados().subscribe();

        expect(getMenus).toHaveBeenCalledTimes(1);
        expect(service.menus()).toEqual(menus);
        expect(service.tieneRuta('/main/reportes')).toBe(true);
        expect(service.tieneRuta('/main/home')).toBe(true);
        expect(service.tieneRuta('/main/kardex')).toBe(false);
    });

    it('vuelve a pedir los menús si cambió el token (otro usuario sin recargar la página)', () => {
        service.asegurarCargados().subscribe();
        localStorage.setItem(STORAGE_KEYS.TOKEN, 'token-b');
        getMenus.mockReturnValue(of([menus[0]]));

        let tiene: boolean | undefined;
        service.tieneRuta$('/main/reportes').subscribe(v => (tiene = v));

        expect(getMenus).toHaveBeenCalledTimes(2);
        expect(tiene).toBe(false);
    });

    it('recargar vuelve a pedir los menús en el momento', () => {
        service.asegurarCargados().subscribe();
        service.recargar();

        expect(getMenus).toHaveBeenCalledTimes(2);
    });

    it('si la API falla no concede acceso y reintenta en el próximo uso', () => {
        getMenus.mockReturnValueOnce(throwError(() => new Error('500')));

        let tiene: boolean | undefined;
        service.tieneRuta$('/main/reportes').subscribe(v => (tiene = v));
        expect(tiene).toBe(false);

        service.tieneRuta$('/main/reportes').subscribe(v => (tiene = v));
        expect(getMenus).toHaveBeenCalledTimes(2);
        expect(tiene).toBe(true);
    });
});

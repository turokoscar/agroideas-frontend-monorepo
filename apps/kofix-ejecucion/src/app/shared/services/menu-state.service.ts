import { Injectable, computed, inject, signal } from '@angular/core';
import { STORAGE_KEYS } from '@agroideas/utils';
import { Observable, catchError, finalize, map, of, shareReplay, tap } from 'rxjs';
import { MenuRepository } from '../../domain/repositories/menu.repository';
import { MenuAgrupado } from '../../domain/models/menu/menu.model';

/** Ruta comparable: sin espacios ni barra final, en minúsculas (la API compara igual). */
export const normalizarRuta = (ruta: string): string => ruta.trim().replace(/\/+$/, '').toLowerCase();

/**
 * Menús del usuario (GET /api/menus), cargados una sola vez y compartidos por el sidebar y por
 * `menuGuard` (ADR-028): el menú asignado al rol es lo que da acceso a una pantalla.
 *
 * Recuerda con qué token se cargaron: si cambia (otro usuario inició sesión sin recargar la
 * página) los vuelve a pedir, para no aplicar los menús de otro usuario.
 */
@Injectable({ providedIn: 'root' })
export class MenuStateService {
    private readonly menuRepository = inject(MenuRepository);

    private readonly _menus = signal<MenuAgrupado[]>([]);
    readonly menus = this._menus.asReadonly();

    /** Rutas de todos los menús y submenús, normalizadas. */
    readonly rutas = computed(() => new Set(
        this._menus().flatMap(m => [m, ...(m.hijos ?? [])]).map(m => m.ruta).filter((r): r is string => !!r).map(normalizarRuta)
    ));

    private tokenCargado: string | null = null;
    private enCurso: Observable<MenuAgrupado[]> | null = null;

    /** Los menús del usuario actual; los pide a la API solo la primera vez o si cambió el token. */
    asegurarCargados(): Observable<MenuAgrupado[]> {
        const token = this.tokenActual();
        if (this.tokenCargado !== null && this.tokenCargado === token) {
            return of(this._menus());
        }
        if (!this.enCurso) {
            this.enCurso = this.menuRepository.getMenus().pipe(
                tap(menus => {
                    this._menus.set(menus);
                    this.tokenCargado = token;
                }),
                // Sin menús no se concede acceso; el error no se cachea, se reintenta en la próxima navegación.
                catchError(() => of([] as MenuAgrupado[])),
                finalize(() => (this.enCurso = null)),
                shareReplay(1)
            );
        }
        return this.enCurso;
    }

    /** Marca los menús como vencidos: se vuelven a pedir en el próximo uso. */
    invalidar(): void {
        this.tokenCargado = null;
    }

    /** Vuelve a pedir los menús ya (p. ej. tras cambiar asignaciones en Gestión de Menús), así el sidebar se actualiza. */
    recargar(): void {
        this.invalidar();
        this.asegurarCargados().subscribe();
    }

    tieneRuta(ruta: string): boolean {
        return this.rutas().has(normalizarRuta(ruta));
    }

    /** Igual que `tieneRuta`, pero espera a que los menús estén cargados. */
    tieneRuta$(ruta: string): Observable<boolean> {
        return this.asegurarCargados().pipe(map(() => this.tieneRuta(ruta)));
    }

    private tokenActual(): string | null {
        try {
            return localStorage.getItem(STORAGE_KEYS.TOKEN);
        } catch {
            return null;
        }
    }
}

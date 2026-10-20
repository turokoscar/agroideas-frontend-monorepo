import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationStart, Router, provideRouter } from '@angular/router';
import { authGuard, roleGuard } from './auth.guard';
import { AuthService, AuthUser } from '../services/auth.service';
import { CierreRol, ROLES_PERSONAL, rutaInicio } from '../models/rol-cierre.model';
import { appRoutes } from '../../app.routes';

@Component({ standalone: true, template: '' })
class VaciaComponent {}

/** AuthService mínimo: solo lo que leen los guards y la redirección de `''`. */
function authFalso(roles: CierreRol[] | null) {
  const user = signal<AuthUser | null>(
    roles ? { id: '1', nombre: 'Rosa Quispe', iniciales: 'RQ', usuario: 'rq', email: 'rq@x.pe', sigla: '', roles } : null
  );
  return {
    user,
    get isLoggedIn() { return !!user(); },
    roles: () => user()?.roles ?? [],
    inicio: () => rutaInicio(user()?.roles ?? [])
  };
}

describe('guards de sigec-cierre', () => {
  function configurar(roles: CierreRol[] | null, rutas = appRoutes) {
    TestBed.configureTestingModule({
      providers: [provideRouter(rutas), { provide: AuthService, useValue: authFalso(roles) }]
    });
    return TestBed.inject(Router);
  }

  describe('authGuard', () => {
    it('envía a /login si no hay sesión', async () => {
      const router = configurar(null, [
        { path: 'login', component: VaciaComponent },
        { path: 'privada', component: VaciaComponent, canActivate: [authGuard] }
      ]);
      await router.navigateByUrl('/privada');
      expect(router.url).toBe('/login');
    });
  });

  describe('roleGuard', () => {
    function rutasDePrueba() {
      return [
        { path: 'login', component: VaciaComponent },
        { path: 'bandeja', component: VaciaComponent, canActivate: [roleGuard(ROLES_PERSONAL)] },
        { path: 'mi-cierre', component: VaciaComponent, canActivate: [roleGuard(['OA'])] },
        { path: 'sin-acceso', component: VaciaComponent }
      ];
    }

    it('deja pasar si el usuario tiene alguno de los roles', async () => {
      const router = configurar(['USE', 'UR'], rutasDePrueba());
      await router.navigateByUrl('/bandeja');
      expect(router.url).toBe('/bandeja');
    });

    it('envía a /login si no hay sesión', async () => {
      const router = configurar(null, rutasDePrueba());
      await router.navigateByUrl('/bandeja');
      expect(router.url).toBe('/login');
    });

    it('envía a la OA que entra a la bandeja a su propio expediente', async () => {
      const router = configurar(['OA'], rutasDePrueba());
      await router.navigateByUrl('/bandeja');
      expect(router.url).toBe('/mi-cierre');
    });

    it('envía al personal que entra a /mi-cierre a su bandeja', async () => {
      const router = configurar(['DE'], rutasDePrueba());
      await router.navigateByUrl('/mi-cierre');
      expect(router.url).toBe('/bandeja');
    });

    it('envía a /sin-acceso a quien no tiene roles, sin encadenar redirecciones', async () => {
      const router = configurar([], rutasDePrueba());
      const navegaciones: string[] = [];
      router.events.subscribe(e => { if (e instanceof NavigationStart) navegaciones.push(e.url); });

      await router.navigateByUrl('/bandeja');

      expect(router.url).toBe('/sin-acceso');
      expect(navegaciones).toEqual(['/bandeja', '/sin-acceso']);
    });
  });

  describe('rutas de la app (H-01: antes el personal quedaba en un bucle de redirección)', () => {
    it.each<[CierreRol[], string]>([
      [['UN'], '/bandeja'],
      [['JEFE_UN'], '/bandeja'],
      [['UR'], '/bandeja'],
      [['DE'], '/bandeja'],
      [['UAJ'], '/bandeja'],
      [['USE'], '/bandeja'],
      [['ADMIN'], '/bandeja'],
      [['OA'], '/mi-cierre'],
      [[], '/sin-acceso']
    ])('con roles %j, la raíz lleva a %s', async (roles, esperado) => {
      const router = configurar(roles);
      await router.navigateByUrl('/');
      expect(router.url).toBe(esperado);
    });

    it('una ruta desconocida vuelve a la página de inicio del usuario', async () => {
      const router = configurar(['UAJ']);
      await router.navigateByUrl('/cierre/registrar');
      expect(router.url).toBe('/bandeja');
    });
  });
});

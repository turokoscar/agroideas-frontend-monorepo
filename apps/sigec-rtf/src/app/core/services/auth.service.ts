import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { STORAGE_KEYS } from '@agroideas/utils';
import { mapSelUsuario, SelLoginResponse } from '@agroideas/auth';

// No hay rol 'UR' (ADR-010): UN maneja todo el ciclo del expediente, no hay un actor del
// sistema separado para la verificación de campo.
export type UserRole = 'POSTULANTE' | 'UN' | 'DE' | 'UAJ' | 'USE' | 'TECNICO';

/**
 * `sel-api-seguridad` devuelve los roles tal cual están en su catálogo (texto completo en
 * español, ej. "Unidad de Monitoreo"), no los códigos cortos que usan las rutas/guards de esta
 * app (`app.routes.ts`, `auth.guard.ts`). Sin este mapeo, un rol no reconocido cae en el `else`
 * final de `roleGuard` y genera un ciclo de redirección infinito entre rutas (cada guard rechaza
 * y vuelve a redirigir a una ruta que el rol tampoco puede activar), que cuelga la pestaña por
 * completo — no es un bug de red ni de extensiones del navegador.
 *
 * Los roles de personal MIDAGRI que existen para este módulo (RTF) son "Unidad de Monitoreo" y
 * "Unidad de Negocios" — ambos son el mismo especialista que evalúa el RTF (etapa "UN" del
 * flujo), y "Administrador del sistema" con acceso equivalente. Cualquier rol no listado aquí
 * (y cualquier usuario sin roles reconocidos) cae en 'POSTULANTE' — el mismo comportamiento por
 * defecto que ya tenía `normalizarRol`, y a propósito: `roleGuard(['POSTULANTE'])` sí deja pasar
 * ese caso (mostrando el dashboard con error si no hay convenio), en vez de repetir el ciclo.
 */
const ROLES_SIGEC_RTF: Readonly<Record<string, UserRole>> = {
  POSTULANTE: 'POSTULANTE',
  'UNIDAD DE MONITOREO': 'UN',
  'UNIDAD DE NEGOCIOS': 'UN',
  'ADMINISTRADOR DEL SISTEMA': 'UN'
};

function mapearRolSigecRtf(roles: readonly string[] | null | undefined): UserRole {
  for (const rol of roles ?? []) {
    const mapeado = ROLES_SIGEC_RTF[rol?.trim().toUpperCase()];
    if (mapeado) return mapeado;
  }
  return 'POSTULANTE';
}

export interface AuthUser {
  id: string;
  nombre: string;
  iniciales: string;
  usuario: string;
  email: string;
  sigla: string;
  role: UserRole;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private _user = signal<AuthUser | null>(null);
  user = this._user.asReadonly();

  private apiUrl = environment.apiAuth;

  constructor() {
    const token = localStorage.getItem(STORAGE_KEYS.SAT_TOKEN);
    const userStr = localStorage.getItem(STORAGE_KEYS.SAT_USER_SESSION);
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as AuthUser;
        if (esSesionVigente(user)) {
          this._user.set(user);
        } else {
          this.limpiarSesion();
        }
      } catch {
        this.limpiarSesion();
      }
    }
  }

  get isLoggedIn(): boolean {
    return !!this._user();
  }

  getToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.SAT_TOKEN);
  }

  login(usuario: string, password: string): Observable<boolean> {
    return this.http.post<SelLoginResponse>(`${this.apiUrl}/login`, {
      username: usuario,
      password: password,
      deviceId: 'web-admin'
    }).pipe(
      map(res => {
        if (res && res.respuesta === 'OK' && res.datos) {
          const data = res.datos;
          const sesion = mapSelUsuario(data.user);

          const user: AuthUser = {
            id: sesion.id,
            nombre: sesion.nombre,
            iniciales: sesion.iniciales,
            usuario: sesion.usuario,
            email: sesion.email,
            sigla: sesion.sigla,
            role: mapearRolSigecRtf(data.user.roles)
          };

          localStorage.setItem(STORAGE_KEYS.SAT_TOKEN, data.accessToken);
          localStorage.setItem(STORAGE_KEYS.SAT_USER_SESSION, JSON.stringify(user));
          this._user.set(user);
          return true;
        }
        return false;
      })
    );
  }

  logout(): void {
    this.limpiarSesion();
  }

  private limpiarSesion(): void {
    localStorage.removeItem(STORAGE_KEYS.SAT_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.SAT_USER_SESSION);
    this._user.set(null);
  }
}

/**
 * Descarta las sesiones guardadas con el mapeo antiguo, que no tenían `email`
 * y almacenaban el nombre como "undefined undefined". Obliga a un único
 * re-login en lugar de arrastrar el dato roto.
 */
function esSesionVigente(user: AuthUser | null): boolean {
  return !!user?.email && !!user.nombre && !user.nombre.includes('undefined');
}

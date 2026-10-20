import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { STORAGE_KEYS } from '@agroideas/utils';
import { mapSelUsuario, SelLoginResponse } from '@agroideas/auth';
import { CierreRol, ETIQUETA_ROL, mapearRolesCierre, rutaInicio } from '../models/rol-cierre.model';

export interface AuthUser {
  id: string;
  nombre: string;
  iniciales: string;
  usuario: string;
  email: string;
  sigla: string;
  /** Todos los roles del usuario reconocidos por el módulo (ADR 0013, D2). */
  roles: CierreRol[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private _user = signal<AuthUser | null>(null);
  user = this._user.asReadonly();

  roles = computed(() => this._user()?.roles ?? []);
  /** Ruta a la que se envía al usuario al entrar o cuando un guard lo rechaza. */
  inicio = computed(() => rutaInicio(this.roles()));
  /** Etiqueta del rol principal (el primero del catálogo), para el shell. */
  etiquetaRol = computed(() => {
    const [principal] = this.roles();
    return principal ? ETIQUETA_ROL[principal] : 'Sin rol';
  });

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
      email: usuario,
      password: password,
      deviceId: environment.deviceId
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
            roles: mapearRolesCierre(data.user.roles)
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
 * Descarta las sesiones guardadas con un formato anterior: sin `email`, con el nombre
 * "undefined undefined" o con un único `role` en lugar de la lista `roles` (antes del
 * ADR 0013). Obliga a un único re-login en lugar de arrastrar el dato roto.
 */
function esSesionVigente(user: AuthUser | null): boolean {
  return !!user?.email && !!user.nombre && !user.nombre.includes('undefined') && Array.isArray(user.roles);
}

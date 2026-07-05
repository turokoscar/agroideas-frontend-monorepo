import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { STORAGE_KEYS } from '@agroideas/utils';

export type UserRole = 'POSTULANTE' | 'UR' | 'UN' | 'DE' | 'UAJ' | 'USE' | 'TECNICO';

export interface AuthUser {
  id: string;
  nombre: string;
  usuario: string;
  role: UserRole;
}

interface LoginResponse {
  respuesta: 'OK' | 'ERROR';
  mensaje: string;
  datos: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: {
      id: number;
      dni: string;
      name: string;
      paterno: string;
      materno: string;
      telefono: string;
      usuario: string;
      email: string;
      estado: number;
      sigla: string;
      roles: string[];
    };
  };
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
        const user = JSON.parse(userStr);
        this._user.set(user);
      } catch {
        this.logout();
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
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, {
      email: usuario,
      password: password,
      deviceId: 'web-admin'
    }).pipe(
      map(res => {
        if (res && res.respuesta === 'OK' && res.datos) {
          const data = res.datos;
          const apiUser = data.user;
          
          let role: UserRole = 'POSTULANTE';
          if (apiUser.roles && apiUser.roles.length > 0) {
            const rawRole = apiUser.roles[0].toUpperCase();
            if (rawRole === 'OA' || rawRole === 'POSTULANTE') {
              role = 'POSTULANTE';
            } else {
              role = rawRole as UserRole;
            }
          }
          
          const user: AuthUser = {
            id: apiUser.id.toString(),
            nombre: `${apiUser.name} ${apiUser.paterno} ${apiUser.materno || ''}`.trim(),
            usuario: apiUser.usuario,
            role: role
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
    localStorage.removeItem(STORAGE_KEYS.SAT_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.SAT_USER_SESSION);
    this._user.set(null);
  }
}

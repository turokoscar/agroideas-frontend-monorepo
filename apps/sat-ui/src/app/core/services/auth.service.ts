import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthUser } from '../../shared/models/auth.model';
import { environment } from '../../../environments/environment';
import { STORAGE_KEYS } from '@agroideas/utils';

interface LoginResponse {
  exitoso: boolean;
  datos: {
    token: string;
    ideAsistente?: string;
    txtNombres: string;
    txtApellidoPaterno: string;
    txtApellidoMaterno?: string;
    codUsuario: string;
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
      username: usuario,
      password: password,
      deviceId: 'web-admin'
    }).pipe(
      map(res => {
        if (res && res.exitoso && res.datos) {
          const data = res.datos;
          const user: AuthUser = {
            id: data.ideAsistente || 'asis-001',
            nombre: `${data.txtNombres} ${data.txtApellidoPaterno} ${data.txtApellidoMaterno || ''}`.trim(),
            usuario: data.codUsuario,
            role: 'asistente'
          };
          
          localStorage.setItem(STORAGE_KEYS.SAT_TOKEN, data.token);
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


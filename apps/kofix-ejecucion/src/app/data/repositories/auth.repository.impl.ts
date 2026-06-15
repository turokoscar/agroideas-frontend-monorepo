import { ResponseDto, STORAGE_KEYS, decodeJwt, extractRoles, getExpiration, isExpired } from '@agroideas/utils';
import { AlertService } from '@agroideas/feedback';
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, of, switchMap, catchError, map } from 'rxjs';
import { AuthRepository } from '../../domain/repositories/auth.repository';
import { AuthResponse, User } from '../../domain/models/auth/auth.model';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class AuthRepositoryImpl implements AuthRepository {
    private http = inject(HttpClient);
    private alertService = inject(AlertService);
    private readonly TOKEN_KEY = STORAGE_KEYS.TOKEN;
    private readonly REFRESH_TOKEN_KEY = STORAGE_KEYS.REFRESH_TOKEN;
    private readonly PERMISSIONS_KEY = STORAGE_KEYS.PERMISSIONS;

    private _isAuthenticated = signal<boolean>(false);
    private _user = signal<User | null>(null);
    private _userPermissions = signal<string[]>([]);
    private _isLoadingPermissions = signal<boolean>(false);
    private _permissionsInitialized = signal<boolean>(false);

    isAuthenticated$ = this._isAuthenticated.asReadonly();
    user$ = this._user.asReadonly();
    userPermissions$ = this._userPermissions.asReadonly();
    isLoadingPermissions$ = this._isLoadingPermissions.asReadonly();
    permissionsInitialized$ = this._permissionsInitialized.asReadonly();

    constructor() {
        this.updateState();
    }

    private updateState(): void {
        const token = this.getToken();
        const expired = this.isTokenExpired();
        const user = this.getUser();
        const permissions = this.getPermissionsFromStorage();

        this._isAuthenticated.set(!!token && !expired);
        this._user.set(user);
        this._userPermissions.set(permissions);
        
        // Si hay permisos en storage, ya están inicializados
        if (permissions.length > 0) {
            this._permissionsInitialized.set(true);
        }

        if (this._isAuthenticated() && permissions.length === 0) {
            this.fetchPermissions().subscribe();
        } else if (!this._isAuthenticated()) {
            // Si no está autenticado, no hay nada que cargar
            this._permissionsInitialized.set(true);
        }
    }

    login(credentials: any): Observable<AuthResponse> {
        return this.http.post<ResponseDto<any>>(`${environment.apiSeguridad}/auth/login`, credentials).pipe(
            switchMap(res => {
                const authRes: AuthResponse = {
                    exitoso: !!res.exitoso,
                    mensaje: res.mensaje,
                    datos: res.datos
                };
                if (res.exitoso && res.datos?.accessToken) {
                    this.saveToken(res.datos.accessToken);
                    if (res.datos?.refreshToken) {
                        this.saveRefreshToken(res.datos.refreshToken);
                    }
                    this._isAuthenticated.set(true);
                    this._user.set(this.getUser());
                    this._permissionsInitialized.set(false);

                    return this.fetchPermissions().pipe(
                        tap(() => this.auditLogin().subscribe()),
                        map(() => authRes),
                        catchError(() => of(authRes))
                    );
                }
                return of(authRes);
            })
        );
    }


    fetchPermissions(): Observable<ResponseDto<string[]>> {
        this._isLoadingPermissions.set(true);
        this._permissionsInitialized.set(false);
        return this.http.get<ResponseDto<string[]>>(`${environment.apiEjecucion}/auth/permisos`).pipe(
            tap(res => {
                if (res.exitoso && res.datos) {
                    this.savePermissions(res.datos);
                    this._userPermissions.set(res.datos);
                }
                this._isLoadingPermissions.set(false);
                this._permissionsInitialized.set(true);
            }),
            catchError(err => {
                this._userPermissions.set([]);
                this._isLoadingPermissions.set(false);
                this._permissionsInitialized.set(true);
                return of({ 
                    exitoso: false, 
                    mensaje: 'Error al cargar permisos',
                    respuesta: 'ERROR',
                    codigo: null,
                    datos: [],
                    total: 0
                } as any);
            })
        );
    }

    private auditLogin(): Observable<any> {
        return this.http.post(`${environment.apiEjecucion}/auth/login-audit`, {});
    }

    saveToken(token: string): void {
        localStorage.setItem(this.TOKEN_KEY, token);
    }

    getToken(): string | null {
        return localStorage.getItem(this.TOKEN_KEY);
    }

    savePermissions(permissions: string[]): void {
        localStorage.setItem(this.PERMISSIONS_KEY, JSON.stringify(permissions));
    }

    getPermissionsFromStorage(): string[] {
        const stored = localStorage.getItem(this.PERMISSIONS_KEY);
        return stored ? JSON.parse(stored) : [];
    }

    logout(): void {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.REFRESH_TOKEN_KEY);
        localStorage.removeItem(this.PERMISSIONS_KEY);
        this._isAuthenticated.set(false);
        this._user.set(null);
        this._userPermissions.set([]);
        this._permissionsInitialized.set(true);
        window.location.href = '/login';
    }

    saveRefreshToken(token: string): void {
        localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
    }

    getRefreshToken(): string | null {
        return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    }

    refreshToken(): Observable<ResponseDto<any>> {
        const refreshToken = this.getRefreshToken();
        if (!refreshToken) {
            return of({
                exitoso: false,
                mensaje: 'No hay refresh token disponible'
            } as ResponseDto<any>);
        }

        return this.http.post<ResponseDto<any>>(
            `${environment.apiSeguridad}/auth/refresh`,
            { refreshToken }
        ).pipe(
            map(res => {
                if (res.exitoso && res.datos?.accessToken) {
                    this.saveToken(res.datos.accessToken);
                    if (res.datos?.refreshToken) {
                        this.saveRefreshToken(res.datos.refreshToken);
                    }
                    this._user.set(this.getUser());
                }
                return res;
            }),
            catchError(err => {
                return of({
                    exitoso: false,
                    mensaje: 'Error al refreshing token'
                } as ResponseDto<any>);
            })
        );
    }

    checkExpiration(): void {
        const token = this.getToken();
        if (token && this.isTokenExpired()) {
            const refreshToken = this.getRefreshToken();
            if (refreshToken && !this.isRefreshTokenExpired()) {
                this.refreshToken().subscribe({
                    next: (res) => {
                        if (res.exitoso) {
                            this._isAuthenticated.set(true);
                        } else {
                            this.alertService.show('Sesión Finalizada', 'Su sesión ha caducado. Inicie sesión nuevamente.', 'info');
                            this.logout();
                        }
                    },
                    error: () => {
                        this.alertService.show('Sesión Finalizada', 'Su sesión ha caducado. Inicie sesión nuevamente.', 'info');
                        this.logout();
                    }
                });
            } else {
                this.alertService.show('Sesión Finalizada', 'Su sesión ha caducado. Inicie sesión nuevamente.', 'info');
                this.logout();
            }
        }
    }

    private isRefreshTokenExpired(): boolean {
        const payload = decodeJwt(this.getRefreshToken());
        // Si el refresh token no es un JWT decodificable o no incluye `exp`,
        // no es posible determinar su expiración en el cliente: se deja que el
        // servidor la valide al intentar refrescar.
        if (!payload || payload.exp === undefined) {
            return false;
        }
        return isExpired(payload);
    }

    isAuthenticated(): boolean {
        return !!this.getToken() && !this.isTokenExpired();
    }

    isTokenExpired(): boolean {
        return isExpired(decodeJwt(this.getToken()));
    }

    getExpirationTime(): number | null {
        return getExpiration(decodeJwt(this.getToken()));
    }

    getUser(): User | null {
        const payload = decodeJwt(this.getToken());
        if (!payload) return null;

        const allRoles = extractRoles(payload);
        return {
            name: payload.given_name || payload.unique_name || payload.name || 'Usuario',
            email: payload.email ?? '',
            role: allRoles.length > 0 ? allRoles[0] : '',
            roles: allRoles
        };
    }
}

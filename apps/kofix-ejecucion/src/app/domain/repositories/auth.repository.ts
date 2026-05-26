import { Observable } from 'rxjs';
import { AuthResponse, User } from '../models/auth/auth.model';
import { Signal } from '@angular/core';

export abstract class AuthRepository {
    abstract isAuthenticated$: Signal<boolean>;
    abstract user$: Signal<User | null>;
    abstract userPermissions$: Signal<string[]>;
    abstract isLoadingPermissions$: Signal<boolean>;
    abstract permissionsInitialized$: Signal<boolean>;

    abstract login(credentials: any): Observable<AuthResponse>;
    abstract logout(): void;
    abstract isAuthenticated(): boolean;
    abstract getUser(): User | null;
    abstract saveToken(token: string): void;
    abstract getToken(): string | null;
    abstract isTokenExpired(): boolean;
    abstract getExpirationTime(): number | null;
    abstract checkExpiration(): void;
}

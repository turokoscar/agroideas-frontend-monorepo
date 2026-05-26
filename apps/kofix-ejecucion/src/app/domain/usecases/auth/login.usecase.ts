import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthRepository } from '../../repositories/auth.repository';
import { AuthResponse } from '../../models/auth/auth.model';

@Injectable({ providedIn: 'root' })
export class LoginUseCase {
    constructor(private repository: AuthRepository) { }

    execute(credentials: any): Observable<AuthResponse> {
        return this.repository.login(credentials);
    }
}

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { Router } from '@angular/router';
import { AuthRepository } from '../../../domain/repositories/auth.repository';
import { finalize } from 'rxjs/operators';
import { LoginFormComponent } from '../../components/login-form/login-form.component';

@Component({
    selector: 'app-login-page',
    standalone: true,
    imports: [LoginFormComponent],
    templateUrl: './login.page.html',
    styleUrls: ['./login.page.sass'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginPageComponent {
    private authRepo = inject(AuthRepository);
    private router = inject(Router);

    loading = signal(false);
    errorMessage = signal('');

    handleLogin(credentials: any) {
        this.loading.set(true);
        this.errorMessage.set('');
        this.authRepo.login(credentials).pipe(finalize(() => this.loading.set(false))).subscribe({
            next: (res) => {
                if (res.exitoso) {
                    this.router.navigate(['/main']);
                } else {
                    this.errorMessage.set(res.mensaje || 'Credenciales inválidas');
                }
            },
            error: (err) => {
                this.errorMessage.set('No se pudo conectar con el servidor de seguridad');
            }
        });
    }
}

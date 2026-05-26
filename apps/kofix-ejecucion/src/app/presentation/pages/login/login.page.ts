import { Component, inject, signal } from '@angular/core';

import { Router } from '@angular/router';
import { LoginUseCase } from '../../../domain/usecases/auth/login.usecase';
import { LoginFormComponent } from '../../components/login-form/login-form.component';

@Component({
    selector: 'app-login-page',
    standalone: true,
    imports: [LoginFormComponent],
    templateUrl: './login.page.html',
    styleUrls: ['./login.page.sass']
})
export class LoginPageComponent {
    private loginUseCase = inject(LoginUseCase);
    private router = inject(Router);

    loading = false;
    errorMessage = '';

    handleLogin(credentials: any) {
        this.loading = true;
        this.errorMessage = '';
        this.loginUseCase.execute(credentials).subscribe({
            next: (res) => {
                if (res.exitoso) {
                    this.router.navigate(['/main']);
                } else {
                    this.errorMessage = res.mensaje || 'Credenciales inválidas';
                    this.loading = false;
                }
            },
            error: (err) => {
                this.errorMessage = 'No se pudo conectar con el servidor de seguridad';
                this.loading = false;
            }
        });
    }
}

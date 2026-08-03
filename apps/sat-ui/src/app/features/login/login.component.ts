import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UIButtonComponent } from '@agroideas/ui';
import { mensajeParaUsuario } from '@agroideas/utils';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, UIButtonComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  loginForm = this.fb.group({
    usuario: ['', [Validators.required]],
    password: ['', [Validators.required]]
  });

  showPw = signal(false);
  error = signal('');
  loading = signal(false);

  togglePassword() {
    this.showPw.update(v => !v);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.loading.set(true);
      this.error.set('');
      const { usuario, password } = this.loginForm.value;
      
      this.authService.login(usuario || '', password || '')
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
        next: (success) => {
          if (success) {
            this.router.navigate(['/dashboard']);
          } else {
            this.error.set('Credenciales inválidas o cuenta inactiva.');
            this.loading.set(false);
          }
        },
        error: (err) => {
          console.error('Login error:', err);
          const errorMsg = mensajeParaUsuario(err, 'Error de conexión con el servidor.');
          this.error.set(errorMsg);
          this.loading.set(false);
        }
      });
    } else {
      this.loginForm.markAllAsTouched();
    }
  }
}

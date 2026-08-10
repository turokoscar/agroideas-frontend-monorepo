import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { UIButtonComponent } from '@agroideas/ui';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, UIButtonComponent],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  username = '';
  password = '';

  selectedTab = signal<'postulante' | 'personal'>('postulante');
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  onSubmit() {
    if (!this.username || !this.password) return;

    // Optional client-side verification for RUC format
    if (this.selectedTab() === 'postulante' && !/^\d{11}$/.test(this.username)) {
      this.errorMessage.set('El RUC debe constar de 11 dígitos numéricos.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.login(this.username, this.password).subscribe({
      next: (success) => {
        this.loading.set(false);
        if (success) {
          const user = this.authService.user();
          if (user) {
            this.redirectByUserRole(user.role);
          }
        } else {
          this.errorMessage.set('Usuario o contraseña incorrectos.');
        }
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Error de conexión con el servidor de seguridad.');
      }
    });
  }

  private redirectByUserRole(role: string) {
    if (role === 'POSTULANTE') {
      this.router.navigate(['/rtf/dashboard']);
    } else if (role === 'UR') {
      this.router.navigate(['/rtf/auditoria-regional']);
    } else if (role === 'UN' || role === 'DE' || role === 'UAJ' || role === 'USE') {
      this.router.navigate(['/rtf/evaluacion-gabinete']);
    } else {
      this.router.navigate(['/rtf/dashboard']);
    }
  }
}

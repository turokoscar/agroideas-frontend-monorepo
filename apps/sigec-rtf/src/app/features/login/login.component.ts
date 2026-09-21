import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

export const STORAGE_KEY_REMEMBERED_USER = 'sigec_rtf_remembered_user';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  username = '';
  password = '';

  selectedTab = signal<'postulante' | 'personal'>('postulante');
  showPassword = signal(false);
  rememberMe = signal(false);
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  identityLabel = computed(() =>
    this.selectedTab() === 'postulante' ? 'RUC de la Organización' : 'DNI o Correo Institucional'
  );

  identityPlaceholder = computed(() =>
    this.selectedTab() === 'postulante' ? 'Ej. 20605569481' : 'usuario@agroideas.gob.pe o DNI'
  );

  identityMaxLength = computed(() =>
    this.selectedTab() === 'postulante' ? 11 : 40
  );

  identityHelper = computed(() =>
    this.selectedTab() === 'postulante'
      ? 'Ingrese el número de RUC de 11 dígitos registrado en AGROIDEAS.'
      : 'Acceso exclusivo para evaluadores de la Unidad de Negocios y sede central.'
  );

  ngOnInit(): void {
    const savedUser = localStorage.getItem(STORAGE_KEY_REMEMBERED_USER);
    if (savedUser) {
      this.username = savedUser;
      this.rememberMe.set(true);
      if (/^\d{11}$/.test(savedUser)) {
        this.selectedTab.set('postulante');
      } else {
        this.selectedTab.set('personal');
      }
    }
  }

  switchTab(tab: 'postulante' | 'personal'): void {
    this.selectedTab.set(tab);
    this.errorMessage.set(null);
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  onSubmit(): void {
    if (!this.username || !this.password) return;

    // Validación sintáctica en cliente para formato RUC
    if (this.selectedTab() === 'postulante' && !/^\d{11}$/.test(this.username)) {
      this.errorMessage.set('El RUC debe constar de 11 dígitos numéricos.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.login(this.username, this.password).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success) {
          if (this.rememberMe()) {
            localStorage.setItem(STORAGE_KEY_REMEMBERED_USER, this.username);
          } else {
            localStorage.removeItem(STORAGE_KEY_REMEMBERED_USER);
          }

          const user = this.authService.user();
          if (user) {
            this.redirectByUserRole(user.role);
          }
        } else {
          this.errorMessage.set(res.mensaje || 'Usuario o contraseña incorrectos.');
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.mensaje || 'Error de conexión con el servidor de seguridad.');
      }
    });
  }

  // No hay rol 'UR' (ADR-010): UN maneja todo el ciclo del expediente en una sola pantalla.
  private redirectByUserRole(role: string): void {
    if (role === 'POSTULANTE') {
      this.router.navigate(['/rtf/dashboard']);
    } else if (role === 'ADMIN') {
      // ADR-013: el Administrador del sistema aterriza en su propio panel, no en la bandeja de UN.
      this.router.navigate(['/rtf/admin']);
    } else if (role === 'UN' || role === 'DE' || role === 'UAJ' || role === 'USE') {
      this.router.navigate(['/rtf/evaluacion-gabinete']);
    } else {
      this.router.navigate(['/rtf/dashboard']);
    }
  }
}

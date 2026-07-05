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
  template: `
    <div class="min-h-screen flex font-sans">
      <!-- Left Panel - Verde institucional (bg-primary) -->
      <div class="hidden lg:flex lg:w-1/2 bg-primary items-center justify-center relative overflow-hidden">
        <!-- Círculos decorativos -->
        <div class="absolute inset-0 opacity-10">
          <div class="absolute rounded-full border border-primary-foreground/20"
            style="width: 200px; height: 200px; top: 50%; left: 50%; transform: translate(-50%, -50%);"></div>
          <div class="absolute rounded-full border border-primary-foreground/20"
            style="width: 320px; height: 320px; top: 50%; left: 50%; transform: translate(-50%, -50%);"></div>
          <div class="absolute rounded-full border border-primary-foreground/20"
            style="width: 440px; height: 440px; top: 50%; left: 50%; transform: translate(-50%, -50%);"></div>
          <div class="absolute rounded-full border border-primary-foreground/20"
            style="width: 560px; height: 560px; top: 50%; left: 50%; transform: translate(-50%, -50%);"></div>
        </div>

        <!-- Contenido centrado -->
        <div class="text-center z-10 px-12 space-y-4">
          <span class="material-symbols-outlined text-primary-foreground text-7xl">eco</span>
          <h1 class="text-4xl font-extrabold text-primary-foreground tracking-tight">SIGEC</h1>
          <p class="text-primary-foreground/80 text-lg">Sistema de Gestión de Convenios</p>
          <p class="text-primary-foreground/60 text-sm">Reporte Técnico Financiero (RTF)</p>
        </div>
      </div>

      <!-- Right Panel - Formulario -->
      <div class="flex-1 flex flex-col justify-between p-8 bg-background">
        <!-- Header institucional -->
        <div class="flex items-center justify-between max-w-sm w-full mx-auto mt-4">
          <div>
            <p class="text-xs font-bold text-foreground tracking-wide">MIDAGRI</p>
            <p class="text-[9px] text-muted-foreground uppercase tracking-wider">Unidad de Negocios</p>
          </div>
          <div>
            <span class="text-sm font-bold text-primary">AGROIDEAS</span>
          </div>
        </div>

        <!-- Contenido del formulario centrado -->
        <div class="w-full max-w-sm mx-auto my-auto py-8 space-y-6">
          <!-- Logo móvil -->
          <div class="lg:hidden flex flex-col items-center gap-2 mb-6">
            <span class="material-symbols-outlined text-primary text-5xl">eco</span>
            <span class="text-2xl font-bold text-foreground">SIGEC · RTF</span>
          </div>

          <div>
            <h2 class="text-2xl font-semibold text-foreground">Iniciar sesión</h2>
            <p class="text-muted-foreground text-sm mt-1">Seleccione su tipo de acceso e ingrese sus credenciales</p>
          </div>

          <!-- Tab Selector -->
          <div class="flex border-b border-border">
            <button
              type="button"
              (click)="selectedTab.set('postulante')"
              class="flex-1 pb-3 text-sm font-semibold border-b-2 transition-all focus:outline-none"
              [class.border-primary]="selectedTab() === 'postulante'"
              [class.text-primary]="selectedTab() === 'postulante'"
              [class.border-transparent]="selectedTab() !== 'postulante'"
              [class.text-muted-foreground]="selectedTab() !== 'postulante'"
            >
              Organización (RUC)
            </button>
            <button
              type="button"
              (click)="selectedTab.set('personal')"
              class="flex-1 pb-3 text-sm font-semibold border-b-2 transition-all focus:outline-none"
              [class.border-primary]="selectedTab() === 'personal'"
              [class.text-primary]="selectedTab() === 'personal'"
              [class.border-transparent]="selectedTab() !== 'personal'"
              [class.text-muted-foreground]="selectedTab() !== 'personal'"
            >
              Personal MIDAGRI
            </button>
          </div>

          <!-- Alert -->
          @if (errorMessage()) {
            <div class="p-3.5 rounded-lg bg-danger-soft border border-danger/20 text-danger text-xs text-center font-medium">
              {{ errorMessage() }}
            </div>
          }

          <form (submit)="onSubmit()" class="space-y-4">
            <div class="space-y-1.5">
              @if (selectedTab() === 'postulante') {
                <label for="username" class="text-sm font-medium text-foreground">RUC de la Organización</label>
                <div class="relative">
                  <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-muted-foreground">business</span>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    maxlength="11"
                    pattern="[0-9]{11}"
                    [(ngModel)]="username"
                    class="w-full pl-10 pr-3 py-2.5 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 border-input text-foreground transition-all placeholder:text-muted-foreground/60 text-sm"
                    placeholder="Ej. 20605569481"
                  />
                </div>
              } @else {
                <label for="username" class="text-sm font-medium text-foreground">Usuario / Correo</label>
                <div class="relative">
                  <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-muted-foreground">person</span>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    [(ngModel)]="username"
                    class="w-full pl-10 pr-3 py-2.5 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 border-input text-foreground transition-all placeholder:text-muted-foreground/60 text-sm"
                    placeholder="nombre.apellido"
                  />
                </div>
              }
            </div>

            <div class="space-y-1.5">
              <label for="password" class="text-sm font-medium text-foreground">Contraseña</label>
              <div class="relative">
                <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-muted-foreground">lock</span>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  [(ngModel)]="password"
                  class="w-full pl-10 pr-3 py-2.5 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 border-input text-foreground transition-all placeholder:text-muted-foreground/60 text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <ui-button
              type="submit"
              [label]="loading() ? 'Iniciando sesión...' : 'Iniciar Sesión'"
              [loading]="loading()"
              [disabled]="loading() || !username || !password"
              [block]="true"
              severity="primary"
            ></ui-button>
          </form>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between text-[10px] text-muted-foreground border-t border-border pt-4 max-w-sm w-full mx-auto mb-4">
          <span>© 2026 MIDAGRI · AGROIDEAS</span>
          <span class="font-semibold uppercase tracking-wider text-[8px]">Version 2.0.0</span>
        </div>
      </div>
    </div>
  `
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
      this.router.navigate(['/rtf/registrar']);
    } else if (role === 'UR') {
      this.router.navigate(['/rtf/auditoria-regional']);
    } else if (role === 'UN' || role === 'DE' || role === 'UAJ' || role === 'USE') {
      this.router.navigate(['/rtf/evaluacion-gabinete']);
    } else {
      this.router.navigate(['/rtf/registrar']);
    }
  }
}

import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { UIButtonComponent } from '@agroideas/ui';
import { AuthService } from '../../core/services/auth.service';

/** Usuario autenticado sin ningún rol del módulo de Cierre (ADR 0013, D2). */
@Component({
  selector: 'app-sin-acceso',
  standalone: true,
  host: { class: 'block' },
  imports: [UIButtonComponent],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-background p-6">
      <div class="max-w-md w-full rounded-xl border border-border bg-card p-8 text-center shadow-sm space-y-4">
        <span class="material-symbols-outlined text-[48px] text-muted-foreground">lock</span>
        <h1 class="text-xl font-bold text-foreground">Sin acceso al módulo de Cierre</h1>
        <p class="text-sm text-muted-foreground">
          Su usuario <span class="font-semibold text-foreground">{{ user()?.email }}</span> no tiene un rol habilitado
          para el Cierre de Convenios. Si cree que es un error, solicite el rol al administrador del sistema.
        </p>
        <ui-button label="Cerrar sesión" icon="logout" severity="secondary" [block]="true" (onClick)="onLogout()"></ui-button>
      </div>
    </div>
  `
})
export class SinAccesoComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  user = this.authService.user;

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

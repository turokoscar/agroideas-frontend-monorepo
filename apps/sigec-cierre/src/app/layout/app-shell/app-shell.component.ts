import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { UiAppShellComponent } from '@agroideas/ui';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, UiAppShellComponent],
  template: `
    <!-- El comportamiento responsive del menú vive en @agroideas/ui -->
    <app-ui-app-shell>
      <!-- Marca -->
      <div shell-brand class="flex items-center gap-3">
        <div class="h-9 w-9 rounded-lg bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground">
          <span class="material-symbols-outlined text-[20px]">eco</span>
        </div>
        <div>
          <span class="font-bold tracking-wider text-sm block uppercase">SIGEC</span>
          <span class="text-[9px] text-sidebar-foreground/70 uppercase tracking-widest font-semibold">Cierre de Convenios</span>
        </div>
      </div>

      <!-- Navigation Links -->
      <nav shell-nav class="p-3 space-y-1">
        @if (user()?.role === 'POSTULANTE') {
          <a
            routerLink="/cierre/registrar"
            routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all"
          >
            <span class="material-symbols-outlined text-[20px]">lock_open</span>
            Cierre Convenio
          </a>
        }
      </nav>

      <!-- User Information & Logout -->
      <div shell-user>
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 shrink-0 rounded-lg bg-sidebar-accent text-sidebar-accent-foreground flex items-center justify-center font-bold uppercase text-xs">
            {{ user()?.iniciales }}
          </div>
          <div class="min-w-0 flex-1">
            <span class="font-semibold text-xs block truncate text-sidebar-foreground">{{ user()?.nombre }}</span>
            <span class="text-[10px] block truncate text-sidebar-foreground/60">{{ user()?.email }}</span>
            <span class="text-[8px] font-bold text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full inline-block mt-0.5 uppercase tracking-widest">{{ user()?.role }}</span>
          </div>
        </div>
        <button
          (click)="onLogout()"
          class="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 transition-colors"
        >
          <span class="material-symbols-outlined text-[18px]">logout</span>
          Cerrar Sesión
        </button>
      </div>

      <!-- Header -->
      <div shell-header class="flex flex-1 items-center justify-between gap-4 min-w-0">
        <div class="flex items-center gap-2 min-w-0">
          <span class="text-xs text-muted-foreground uppercase tracking-wider font-semibold">SIGEC</span>
          <span class="text-xs text-surface-400">/</span>
          <span class="text-xs text-foreground font-medium truncate">Plataforma de Cierre</span>
        </div>
        <div class="hidden sm:flex items-center gap-1.5 bg-success-soft border border-success/20 text-success text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0">
          <span class="h-1.5 w-1.5 rounded-full bg-success animate-pulse"></span>
          Servicio Activo
        </div>
      </div>

      <!-- Page Content -->
      <router-outlet></router-outlet>
    </app-ui-app-shell>
  `
})
export class AppShellComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  user = this.authService.user;

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

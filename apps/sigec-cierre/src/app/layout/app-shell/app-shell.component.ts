import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="flex h-screen bg-background text-foreground font-sans overflow-hidden">
      <!-- Sidebar - Verde oscuro institucional -->
      <aside class="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col justify-between shrink-0">
        <div>
          <!-- Header Logo -->
          <div class="h-16 px-5 flex items-center gap-3 border-b border-sidebar-border bg-sidebar-border/10">
            <div class="h-9 w-9 rounded-lg bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground">
              <span class="material-symbols-outlined text-[20px]">eco</span>
            </div>
            <div>
              <span class="font-bold tracking-wider text-sm block uppercase">SIGEC</span>
              <span class="text-[9px] text-sidebar-foreground/70 uppercase tracking-widest font-semibold">Cierre de Convenios</span>
            </div>
          </div>

          <!-- Navigation Links -->
          <nav class="p-3 space-y-1">
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
        </div>

        <!-- User Information & Logout -->
        <div class="border-t border-sidebar-border px-4 py-4 space-y-3">
          <div class="flex items-center gap-3">
            <div class="h-9 w-9 rounded-lg bg-sidebar-accent text-sidebar-accent-foreground flex items-center justify-center font-bold uppercase text-xs">
              {{ user()?.nombre?.substring(0,2) }}
            </div>
            <div class="min-w-0 flex-1">
              <span class="font-semibold text-xs block truncate text-sidebar-foreground">{{ user()?.nombre }}</span>
              <span class="text-[8px] font-bold text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full inline-block mt-0.5 uppercase tracking-widest">{{ user()?.role }}</span>
            </div>
          </div>
          <button
            (click)="onLogout()"
            class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 transition-colors"
          >
            <span class="material-symbols-outlined text-[18px]">logout</span>
            Cerrar Sesión
          </button>
        </div>
      </aside>

      <!-- Main Panel -->
      <main class="flex-1 flex flex-col min-w-0 bg-background">
        <!-- Header -->
        <header class="h-16 px-8 border-b border-border flex items-center justify-between shrink-0 bg-surface-container-lowest">
          <div class="flex items-center gap-2">
            <span class="text-xs text-muted-foreground uppercase tracking-wider font-semibold">SIGEC</span>
            <span class="text-xs text-surface-400">/</span>
            <span class="text-xs text-foreground font-medium">Plataforma de Cierre</span>
          </div>
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-1.5 bg-success-soft border border-success/20 text-success text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              <span class="h-1.5 w-1.5 rounded-full bg-success animate-pulse"></span>
              Servicio Activo
            </div>
          </div>
        </header>

        <!-- Page Content -->
        <div class="flex-1 overflow-y-auto p-8">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
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

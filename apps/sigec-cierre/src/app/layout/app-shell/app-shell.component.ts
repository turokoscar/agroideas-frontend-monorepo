import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { UiAppShellComponent, UiToastContainerComponent } from '@agroideas/ui';
import { AuthService } from '../../core/services/auth.service';
import { NotificacionBellComponent } from '../notificacion-bell/notificacion-bell.component';
import { CierreRol, ETIQUETA_ROL, ROLES_PERSONAL, tieneAlgunRol } from '../../core/models/rol-cierre.model';

interface ItemMenu {
  ruta: string;
  etiqueta: string;
  icono: string;
  roles: readonly CierreRol[];
}

const MENU: readonly ItemMenu[] = [
  { ruta: '/bandeja', etiqueta: 'Bandeja', icono: 'inbox', roles: ROLES_PERSONAL },
  { ruta: '/mi-cierre', etiqueta: 'Mi cierre', icono: 'assignment', roles: ['OA'] },
  { ruta: '/evaluaciones-impacto', etiqueta: 'Evaluaciones de impacto', icono: 'query_stats', roles: ['USE', 'ADMIN'] },
  { ruta: '/administracion', etiqueta: 'Administración', icono: 'settings', roles: ['ADMIN'] }
];

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, UiAppShellComponent, UiToastContainerComponent, NotificacionBellComponent],
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
        @for (item of menu(); track item.ruta) {
          <a
            [routerLink]="item.ruta"
            routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all"
          >
            <span class="material-symbols-outlined text-[20px]">{{ item.icono }}</span>
            {{ item.etiqueta }}
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
            <span
              class="text-[8px] font-bold text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full inline-block mt-0.5 uppercase tracking-widest max-w-full truncate"
              [title]="todosLosRoles()"
            >{{ etiquetaRol() }}</span>
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
          <span class="text-xs text-foreground font-medium truncate">Cierre de Convenios</span>
        </div>
        <app-notificacion-bell />
      </div>

      <!-- Page Content -->
      <router-outlet></router-outlet>
    </app-ui-app-shell>
    <!-- Aquí y no en AppComponent: así el barrel de @agroideas/ui no entra en el bundle inicial -->
    <app-ui-toast-container></app-ui-toast-container>
  `
})
export class AppShellComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  user = this.authService.user;
  etiquetaRol = this.authService.etiquetaRol;
  menu = computed(() => MENU.filter(item => tieneAlgunRol(this.authService.roles(), item.roles)));
  todosLosRoles = computed(() => this.authService.roles().map(rol => ETIQUETA_ROL[rol]).join(' · '));

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

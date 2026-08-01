import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { UiAppShellComponent } from '@agroideas/ui';
import { AuthService } from '../../core/services/auth.service';
import { PasoCritico, RtfService } from '../../core/services/rtf.service';

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
          <span class="text-[9px] text-sidebar-foreground/70 uppercase tracking-widest font-semibold">Reporte RTF</span>
        </div>
      </div>

      <!-- Navigation Links -->
      <nav shell-nav class="p-3 space-y-1">
            @if (user()?.role === 'POSTULANTE') {
              <!-- Dashboard -->
              <a
                routerLink="/rtf/dashboard"
                routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all"
              >
                <span class="material-symbols-outlined text-[20px]">dashboard</span>
                Inicio / Dashboard
              </a>

              <!-- Bandeja OA -->
              <a
                routerLink="/rtf/bandeja"
                routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all"
              >
                <span class="material-symbols-outlined text-[20px]">inbox</span>
                Bandeja RTF
              </a>

              <!-- Pasos Críticos Collapsible -->
              <div class="space-y-1">
                <button
                  (click)="toggleSteps()"
                  class="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all text-left"
                >
                  <div class="flex items-center gap-3">
                    <span class="material-symbols-outlined text-[20px]">assignment_turned_in</span>
                    <span>Pasos Críticos</span>
                  </div>
                  <span class="material-symbols-outlined text-[16px] transition-transform" [class.rotate-180]="isStepsExpanded()">
                    expand_more
                  </span>
                </button>

                @if (isStepsExpanded()) {
                  <div class="pl-4 space-y-0.5 transition-all">
                    @for (paso of pasos(); track paso.id) {
                      @if (esNavegable(paso)) {
                        <a
                          [routerLink]="['/rtf/pasos-criticos', paso.id, 'registrar']"
                          routerLinkActive="bg-sidebar-accent/30 text-primary font-medium"
                          class="flex items-center justify-between gap-2 px-3 py-1.5 rounded text-[11px] text-sidebar-foreground/70 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground transition-all"
                        >
                          <span class="flex items-center gap-2 min-w-0">
                            <span class="material-symbols-outlined text-[14px]">{{ iconoPaso(paso.status) }}</span>
                            <span class="truncate">{{ paso.label }}</span>
                          </span>
                          <span class="text-[9px] uppercase tracking-wider shrink-0" [class]="colorEstado(paso.status)">
                            {{ paso.status }}
                          </span>
                        </a>
                      } @else {
                        <div
                          class="flex items-center justify-between gap-2 px-3 py-1.5 text-[11px] text-sidebar-foreground/30 cursor-not-allowed"
                          [title]="paso.label + ': aún no habilitado, no tiene reporte iniciado.'"
                        >
                          <span class="flex items-center gap-2 min-w-0">
                            <span class="material-symbols-outlined text-[14px]">lock</span>
                            <span class="truncate">{{ paso.label }}</span>
                          </span>
                          <span class="text-[9px] uppercase tracking-wider shrink-0">{{ paso.status }}</span>
                        </div>
                      }
                    } @empty {
                      <div class="px-3 py-1.5 text-[11px] text-sidebar-foreground/40">
                        {{ pasosCargando() ? 'Cargando pasos críticos…' : 'Sin pasos críticos programados.' }}
                      </div>
                    }
                  </div>
                }
              </div>

              <!-- Reportes Collapsible -->
              <div class="space-y-1">
                <button
                  (click)="toggleReports()"
                  class="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all text-left"
                >
                  <div class="flex items-center gap-3">
                    <span class="material-symbols-outlined text-[20px]">query_stats</span>
                    <span>Reportes</span>
                  </div>
                  <span class="material-symbols-outlined text-[16px] transition-transform" [class.rotate-180]="isReportsExpanded()">
                    expand_more
                  </span>
                </button>

                @if (isReportsExpanded()) {
                  <div class="pl-4 space-y-0.5 border-l border-border/30 transition-all">
                    <a
                      routerLink="/rtf/reportes/metas-fisicas"
                      routerLinkActive="bg-sidebar-accent/30 text-sidebar-accent-foreground font-medium"
                      class="flex items-center gap-2 px-3 py-1.5 rounded text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground transition-all"
                    >
                      <span class="material-symbols-outlined text-[14px]">trending_up</span>
                      3.1 Metas físicas
                    </a>
                    <a
                      routerLink="/rtf/reportes/metas-financieras"
                      routerLinkActive="bg-sidebar-accent/30 text-sidebar-accent-foreground font-medium"
                      class="flex items-center gap-2 px-3 py-1.5 rounded text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground transition-all"
                    >
                      <span class="material-symbols-outlined text-[14px]">payments</span>
                      3.2 Metas financieras
                    </a>
                  </div>
                }
              </div>
            }

            @if (user()?.role === 'UR') {
              <a
                routerLink="/rtf/auditoria-regional"
                routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all"
              >
                <span class="material-symbols-outlined text-[20px]">fact_check</span>
                Auditoría Regional
              </a>
            }

            @if (user()?.role === 'UN' || user()?.role === 'DE' || user()?.role === 'UAJ' || user()?.role === 'USE') {
              <a
                routerLink="/rtf/dashboard-un"
                routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all"
              >
                <span class="material-symbols-outlined text-[20px]">monitoring</span>
                Dashboard UN
              </a>
              <a
                routerLink="/rtf/evaluacion-gabinete"
                routerLinkActive="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all"
              >
                <span class="material-symbols-outlined text-[20px]">gavel</span>
                Evaluación Gabinete
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
          <span class="text-xs text-foreground font-medium truncate">Plataforma de Reporte y Validación</span>
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
export class AppShellComponent implements OnInit {
  private authService = inject(AuthService);
  private rtfService = inject(RtfService);
  private router = inject(Router);

  user = this.authService.user;

  /** Pasos críticos reales del convenio; alimentan el submenú. */
  pasos = this.rtfService.pasos;
  pasosCargando = signal(false);

  isStepsExpanded = signal(true);
  isReportsExpanded = signal(true);

  ngOnInit() {
    // Solo la OA navega por pasos críticos; UR y UN trabajan desde sus bandejas.
    if (this.user()?.role !== 'POSTULANTE') return;

    this.pasosCargando.set(true);
    this.rtfService.cargarPasosCriticosDelUsuario().subscribe({
      next: () => this.pasosCargando.set(false),
      error: (err) => {
        console.error('No se pudieron cargar los pasos críticos del menú', err);
        this.pasosCargando.set(false);
      }
    });
  }

  /**
   * Un paso se abre cuando tiene reporte iniciado o es el habilitado. Los
   * `Pendiente` no tienen RTF todavía, así que no hay nada que mostrar.
   */
  esNavegable(paso: PasoCritico): boolean {
    return paso.status !== 'Pendiente';
  }

  iconoPaso(status: PasoCritico['status']): string {
    switch (status) {
      case 'Activo': return 'edit_note';
      case 'Aprobado':
      case 'Validado': return 'task_alt';
      case 'Rechazado': return 'cancel';
      case 'Vencido': return 'schedule';
      default: return 'lock';
    }
  }

  colorEstado(status: PasoCritico['status']): string {
    switch (status) {
      case 'Activo': return 'text-primary font-bold';
      case 'Aprobado':
      case 'Validado': return 'text-success';
      case 'Rechazado':
      case 'Vencido': return 'text-danger';
      default: return 'text-sidebar-foreground/40';
    }
  }

  toggleSteps() {
    this.isStepsExpanded.update(v => !v);
  }

  toggleReports() {
    this.isReportsExpanded.update(v => !v);
  }

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

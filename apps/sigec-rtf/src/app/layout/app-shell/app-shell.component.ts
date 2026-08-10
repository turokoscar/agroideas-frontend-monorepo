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
  templateUrl: './app-shell.component.html'
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

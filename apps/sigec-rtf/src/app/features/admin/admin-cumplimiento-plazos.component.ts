import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../core/services/admin.service';
import { ReporteCumplimientoPlazosDto } from '../../core/models';
import { UIButtonComponent, ToastService } from '@agroideas/ui';

function formatoFecha(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

interface FilaDistribucion {
  label: string;
  count: number;
  pct: number;
  colorClass: string;
}

@Component({
  selector: 'app-admin-cumplimiento-plazos',
  standalone: true,
  imports: [CommonModule, RouterLink, UIButtonComponent],
  templateUrl: './admin-cumplimiento-plazos.component.html'
})
export class AdminCumplimientoPlazosComponent implements OnInit {
  private adminService = inject(AdminService);
  private toast = inject(ToastService);

  // Rango por defecto: últimos 30 días.
  desde = signal(formatoFecha(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
  hasta = signal(formatoFecha(new Date()));

  cargando = signal(false);
  reporte = signal<ReporteCumplimientoPlazosDto | null>(null);

  total = computed(() => {
    const r = this.reporte();
    if (!r) return 0;
    return r.rtfsVencidos + r.cartasNotificacion + r.cartasNotariales + r.bloqueosDefinitivos;
  });

  distribucion = computed<FilaDistribucion[]>(() => {
    const r = this.reporte();
    const total = this.total();
    if (!r || total === 0) return [];
    const pct = (n: number) => Math.round((n / total) * 100);
    return [
      { label: 'RTFs Vencidos', count: r.rtfsVencidos, pct: pct(r.rtfsVencidos), colorClass: 'bg-amber-500' },
      { label: 'Cartas de Notificación', count: r.cartasNotificacion, pct: pct(r.cartasNotificacion), colorClass: 'bg-info' },
      { label: 'Cartas Notariales', count: r.cartasNotariales, pct: pct(r.cartasNotariales), colorClass: 'bg-sky-700' },
      { label: 'Bloqueos Definitivos', count: r.bloqueosDefinitivos, pct: pct(r.bloqueosDefinitivos), colorClass: 'bg-destructive' }
    ];
  });

  ngOnInit(): void {
    this.consultar();
  }

  consultar(): void {
    if (this.hasta() < this.desde()) {
      this.toast.warning('Rango inválido', 'La fecha "hasta" no puede ser anterior a la fecha "desde".');
      return;
    }

    this.cargando.set(true);
    this.adminService.obtenerReporteCumplimientoPlazos(this.desde(), this.hasta()).subscribe({
      next: reporte => {
        this.cargando.set(false);
        this.reporte.set(reporte ?? null);
      },
      error: err => {
        this.cargando.set(false);
        const mensaje = err?.error?.mensaje || 'No se pudo generar el reporte. Intente nuevamente.';
        this.toast.error('No se pudo generar el reporte', mensaje);
      }
    });
  }
}

import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../core/services/admin.service';
import { ReporteCumplimientoPlazosDto } from '../../core/models';
import { UIButtonComponent, ToastService, UiKpiComponent } from '@agroideas/ui';
import { UiChartColor, UiChartComponent, UiChartDataset } from '@agroideas/ui/chart';

function formatoFecha(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

interface FilaDistribucion {
  label: string;
  count: number;
  pct: number;
  /** Token del tema, compartido por el KPI y su barra en el gráfico. */
  color: UiChartColor;
}

@Component({
  selector: 'app-admin-cumplimiento-plazos',
  standalone: true,
  imports: [CommonModule, RouterLink, UIButtonComponent, UiKpiComponent, UiChartComponent],
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

  /** Porcentaje de un tipo de evento sobre el total del rango; 0 si no hubo eventos. */
  pctDe(n: number): number {
    const total = this.total();
    return total > 0 ? Math.round((n / total) * 100) : 0;
  }

  distribucion = computed<FilaDistribucion[]>(() => {
    const r = this.reporte();
    if (!r || this.total() === 0) return [];
    return [
      { label: 'RTFs Vencidos', count: r.rtfsVencidos, pct: this.pctDe(r.rtfsVencidos), color: 'warning' },
      { label: 'Cartas de Notificación', count: r.cartasNotificacion, pct: this.pctDe(r.cartasNotificacion), color: 'info' },
      { label: 'Cartas Notariales', count: r.cartasNotariales, pct: this.pctDe(r.cartasNotariales), color: 'primary' },
      { label: 'Bloqueos Definitivos', count: r.bloqueosDefinitivos, pct: this.pctDe(r.bloqueosDefinitivos), color: 'danger' }
    ];
  });

  /** Etiquetas con el porcentaje del total, p.ej. "RTFs Vencidos (40%)". */
  distribucionLabels = computed(() => this.distribucion().map(f => `${f.label} (${f.pct}%)`));

  distribucionDatasets = computed<UiChartDataset[]>(() => {
    const filas = this.distribucion();
    return [{ label: 'Eventos', data: filas.map(f => f.count), color: filas.map(f => f.color) }];
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

import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../core/services/admin.service';
import { ReporteProductividadUnItemDto } from '../../core/models';
import { UIButtonComponent, ToastService } from '@agroideas/ui';

function formatoFecha(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

@Component({
  selector: 'app-admin-productividad-un',
  standalone: true,
  imports: [CommonModule, DecimalPipe, RouterLink, UIButtonComponent],
  templateUrl: './admin-productividad-un.component.html'
})
export class AdminProductividadUnComponent implements OnInit {
  private adminService = inject(AdminService);
  private toast = inject(ToastService);

  // Rango por defecto: últimos 30 días.
  desde = signal(formatoFecha(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
  hasta = signal(formatoFecha(new Date()));

  cargando = signal(false);
  items = signal<ReporteProductividadUnItemDto[]>([]);

  totalExpedientes = computed(() => this.items().reduce((acc, i) => acc + i.expedientesAtendidos, 0));

  promedioGeneral = computed(() => {
    const items = this.items();
    if (items.length === 0) return 0;
    const totalDias = items.reduce((acc, i) => acc + i.promedioDias * i.expedientesAtendidos, 0);
    const totalExpedientes = this.totalExpedientes();
    return totalExpedientes === 0 ? 0 : totalDias / totalExpedientes;
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
    this.adminService.obtenerReporteProductividadUn(this.desde(), this.hasta()).subscribe({
      next: items => {
        this.cargando.set(false);
        this.items.set(items);
      },
      error: err => {
        this.cargando.set(false);
        this.items.set([]);
        const mensaje = err?.error?.mensaje || 'No se pudo generar el reporte. Intente nuevamente.';
        this.toast.error('No se pudo generar el reporte', mensaje);
      }
    });
  }
}

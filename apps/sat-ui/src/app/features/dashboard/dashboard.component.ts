import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService, ActividadReciente, SyncLogResumen } from '../../core/services/dashboard.service';
import { UiKpiComponent, UICardComponent, UiStatusPillComponent, StatusType } from '@agroideas/ui';
import { FormatDatePipe } from '@agroideas/utils';
import { getSyncStatus } from '../../shared/utils/estado-labels';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, UiKpiComponent, UICardComponent, UiStatusPillComponent, FormatDatePipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);

  asistentesCount = signal(0);
  activosCount = signal(0);
  totalEvidencias = signal(0);
  pendientesCount = signal(0);
  modificadasCount = signal(0);
  actividadesCount = signal(0);
  sincronizadasCount = signal(0);
  informesCount = signal(0);
  generadosCount = signal(0);

  recentActividades = signal<ActividadReciente[]>([]);
  latestSyncs = signal<SyncLogResumen[]>([]);

  ngOnInit() {
    this.dashboardService.obtenerResumen().subscribe({
      next: (res) => {
        this.asistentesCount.set(res.totalAsistentes);
        this.activosCount.set(res.activosCount);
        this.totalEvidencias.set(res.totalEvidencias);
        this.pendientesCount.set(res.pendientesCount);
        this.modificadasCount.set(res.modificadasCount);
        this.actividadesCount.set(res.totalActividades);
        this.sincronizadasCount.set(res.sincronizadasCount);
        this.informesCount.set(res.totalInformes);
        this.generadosCount.set(res.generadosCount);
        this.recentActividades.set(res.actividadesRecientes);
        this.latestSyncs.set(res.ultimasSincronizaciones);
      },
      error: (err) => console.error('Error cargando resumen de dashboard', err)
    });
  }

  getTipoIntervencionLabel(t: string): string {
    const map: Record<string, string> = {
      capacitacion: 'Capacitación',
      visita_tecnica: 'Visita Técnica',
      seguimiento: 'Seguimiento',
    };
    return map[t] || t;
  }

  getSyncStatus(estado: string): { status: StatusType, text: string } {
    return getSyncStatus(estado);
  }
}

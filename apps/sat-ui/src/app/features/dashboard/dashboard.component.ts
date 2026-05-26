import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../core/services/data.service';
import { UiKpiComponent, UICardComponent, UiStatusPillComponent, StatusType } from '@agroideas/ui';
import { TipoIntervencion } from '../../shared/models/sat-data.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, UiKpiComponent, UICardComponent, UiStatusPillComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  private dataService = inject(DataService);

  asistentes = this.dataService.asistentes;
  actividades = this.dataService.actividades;
  evidencias = this.dataService.evidencias;
  informes = this.dataService.informes;
  syncLogsList = this.dataService.syncLogs;

  activosCount = computed(() => this.asistentes().filter(a => a.activo).length);
  totalEvidencias = computed(() => this.evidencias().length);
  pendientesCount = computed(() => this.evidencias().filter(e => e.estadoSync === 'pendiente').length);
  modificadasCount = computed(() => this.evidencias().filter(e => e.estadoIntegridad === 'modificada').length);

  sincronizadasCount = computed(() => 
    this.actividades().filter(a => a.estadoSync === 'sincronizado').length
  );

  generadosCount = computed(() => 
    this.informes().filter(i => i.estado === 'generado').length
  );

  recentActividades = computed(() => 
    [...this.actividades()]
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
      .slice(0, 5)
  );

  latestSyncs = computed(() => 
    [...this.syncLogsList()]
      .reverse()
      .slice(0, 5)
  );

  getOrganizacionNombre(id: string) {
    return this.dataService.getOrganizacionNombre(id);
  }

  getAsistenteNombre(id: string) {
    return this.dataService.getAsistenteNombre(id);
  }

  getTipoIntervencionLabel(t: TipoIntervencion): string {
    return this.dataService.getTipoIntervencionLabel(t);
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-PE');
  }

  getSyncStatus(estado: string): { status: StatusType, text: string } {
    const map: Record<string, { status: StatusType, text: string }> = {
      sincronizado: { status: 'Aprobado', text: 'Sincronizado' },
      pendiente: { status: 'Pendiente', text: 'Pendiente' },
      error: { status: 'Rechazado', text: 'Error' },
      exitoso: { status: 'Aprobado', text: 'Exitoso' },
      error_parcial: { status: 'Suspendido', text: 'Error Parcial' }
    };
    return map[estado] ?? { status: 'Pendiente', text: estado };
  }
}

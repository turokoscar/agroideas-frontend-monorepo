import { ChangeDetectionStrategy, Component, EventEmitter, Output, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SyncLogDto } from '../../../../core/services/sync.service';
import { FormatDatePipe } from '@agroideas/utils';
import { getResultadoLabel } from '../../../../shared/utils/estado-labels';
import { UiDataTableComponent, TableColumn } from '@agroideas/ui';

@Component({
  selector: 'app-sync-history-table',
  standalone: true,
  imports: [CommonModule, FormatDatePipe, UiDataTableComponent],
  styles: [`:host { display: block; }`],
  template: `
    <app-ui-data-table
      [data]="sincronizaciones()"
      [columns]="columns"
      [loading]="loading()"
      [lazy]="true"
      [totalRecords]="total()"
      [rows]="tamanioPagina()"
      [first]="first()"
      [hasActions]="false"
      [showIndex]="false"
      emptyIcon="sync_disabled"
      emptyMessage="Sin sincronizaciones registradas"
      emptySubMessage="Las sincronizaciones aparecerán aquí cuando el aplicativo móvil envíe datos al servidor."
      [rowTemplate]="rowTemplate"
      (onLazyLoad)="lazyLoad.emit($event)"
    >
      <ng-template #rowTemplate let-row let-col="col">
        @if (col.field === 'fecSync') {
          <div>
            <div class="font-medium text-slate-700">
              {{ row.fecSync | formatDate: { day: '2-digit', month: 'short', year: 'numeric' }: '' }}
            </div>
            <div class="text-xs text-slate-400">
              {{ formatTime(row.fecSync) }}
            </div>
          </div>
        } @else if (col.field === 'codDispositivo') {
          <span class="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-mono">
            {{ row.codDispositivo }}
          </span>
        } @else if (col.field === 'actividadesExitosas') {
          <div class="text-center">
            <span class="text-emerald-600 font-bold">{{ row.actividadesExitosas }}</span>
            @if (row.actividadesConError > 0) {
              <span class="text-red-500 text-xs"> / {{ row.actividadesConError }}</span>
            }
            <span class="text-slate-400 text-xs"> / {{ row.totalActividades }}</span>
          </div>
        } @else if (col.field === 'evidenciasExitosas') {
          <div class="text-center font-medium text-slate-700">
            {{ row.evidenciasExitosas }} / {{ row.totalEvidencias }}
          </div>
        } @else if (col.field === 'txtResultado') {
          @let label = getResultadoLabel(row.txtResultado);
          <span class="px-2.5 py-1 text-xs font-medium rounded-full border {{ label.class }}">
            {{ label.text }}
          </span>
        } @else if (col.field === 'txtIpOrigen') {
          <span class="text-xs text-slate-400 font-mono">
            {{ row.txtIpOrigen || 'N/A' }}
          </span>
        }
      </ng-template>
    </app-ui-data-table>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SyncHistoryTableComponent {
  sincronizaciones = input.required<SyncLogDto[]>();
  loading = input.required<boolean>();
  total = input.required<number>();
  paginaActual = input.required<number>();
  tamanioPagina = input.required<number>();

  @Output() lazyLoad = new EventEmitter<{ first: number, rows: number }>();

  first = computed(() => (this.paginaActual() - 1) * this.tamanioPagina());

  columns: TableColumn[] = [
    { field: 'fecSync', header: 'Fecha/Hora', type: 'custom' },
    { field: 'txtAsistente', header: 'Asistente' },
    { field: 'codDispositivo', header: 'Dispositivo', type: 'custom' },
    { field: 'actividadesExitosas', header: 'Actividades', type: 'custom', align: 'center' },
    { field: 'evidenciasExitosas', header: 'Evidencias', type: 'custom', align: 'center' },
    { field: 'txtResultado', header: 'Resultado', type: 'custom', align: 'center' },
    { field: 'txtIpOrigen', header: 'IP Origen', type: 'custom' }
  ];

  getResultadoLabel(resultado: string): { text: string; class: string } {
    return getResultadoLabel(resultado);
  }

  formatTime(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
}

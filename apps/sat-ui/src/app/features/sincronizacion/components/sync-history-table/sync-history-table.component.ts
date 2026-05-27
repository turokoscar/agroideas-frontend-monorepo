import { ChangeDetectionStrategy, Component, EventEmitter, Output, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SyncLogDto } from '../../../../core/services/sync.service';
import { FormatDatePipe } from '@agroideas/utils';
import { getResultadoLabel } from '../../../../shared/utils/estado-labels';

@Component({
  selector: 'app-sync-history-table',
  standalone: true,
  imports: [CommonModule, FormatDatePipe],
  template: `
    <!-- Tabla de Historial -->
    @if (loading() && sincronizaciones().length === 0) {
      <div class="flex items-center justify-center py-12">
        <div class="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
      </div>
    } @else if (sincronizaciones().length === 0) {
      <div class="flex flex-col items-center justify-center text-center py-12 px-4 space-y-4">
        <div class="h-16 w-16 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center border border-dashed border-slate-200">
          <span class="material-symbols-outlined text-3xl">sync_disabled</span>
        </div>
        <div class="max-w-md">
          <h4 class="font-bold text-slate-700 text-sm">Sin sincronizaciones registradas</h4>
          <p class="text-xs text-slate-500 mt-1">Las sincronizaciones aparecerán aquí cuando el aplicativo móvil envíe datos al servidor.</p>
        </div>
      </div>
    } @else {
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-100">
              <th class="text-left py-3 px-4 font-bold text-slate-600">Fecha/Hora</th>
              <th class="text-left py-3 px-4 font-bold text-slate-600">Asistente</th>
              <th class="text-left py-3 px-4 font-bold text-slate-600">Dispositivo</th>
              <th class="text-center py-3 px-4 font-bold text-slate-600">Actividades</th>
              <th class="text-center py-3 px-4 font-bold text-slate-600">Evidencias</th>
              <th class="text-center py-3 px-4 font-bold text-slate-600">Resultado</th>
              <th class="text-left py-3 px-4 font-bold text-slate-600">IP Origen</th>
            </tr>
          </thead>
          <tbody>
            @for (sync of sincronizaciones(); track sync.ideSyncLog) {
              <tr class="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                <td class="py-3 px-4">
                  <div class="font-medium text-slate-700">{{ sync.fecSync | formatDate: { day: '2-digit', month: 'short', year: 'numeric' }: '' }}</div>
                  <div class="text-xs text-slate-400">{{ formatTime(sync.fecSync) }}</div>
                </td>
                <td class="py-3 px-4 font-medium text-slate-700">{{ sync.txtAsistente }}</td>
                <td class="py-3 px-4">
                  <span class="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-mono">{{ sync.codDispositivo }}</span>
                </td>
                <td class="py-3 px-4 text-center">
                  <span class="text-emerald-600 font-bold">{{ sync.actividadesExitosas }}</span>
                  @if (sync.actividadesConError > 0) {
                    <span class="text-red-500 text-xs"> / {{ sync.actividadesConError }}</span>
                  }
                  <span class="text-slate-400 text-xs"> / {{ sync.totalActividades }}</span>
                </td>
                <td class="py-3 px-4 text-center font-medium text-slate-700">{{ sync.evidenciasExitosas }} / {{ sync.totalEvidencias }}</td>
                <td class="py-3 px-4 text-center">
                  @let label = getResultadoLabel(sync.txtResultado);
                  <span class="px-2 py-1 text-xs font-medium rounded-full border {{ label.class }}">{{ label.text }}</span>
                </td>
                <td class="py-3 px-4 text-xs text-slate-400 font-mono">{{ sync.txtIpOrigen || 'N/A' }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Paginación -->
      @if (total() > 0) {
        <div class="flex items-center justify-between pt-4 border-t border-slate-100">
          <span class="text-sm text-slate-500">
            Mostrando {{ sincronizaciones().length }} de {{ total() }} registros
          </span>
          <div class="flex items-center gap-2">
            <button (click)="anterior.emit()" [disabled]="paginaActual() <= 1"
              class="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">
              Anterior
            </button>
            <span class="text-sm text-slate-600">Página {{ paginaActual() }}</span>
            <button (click)="siguiente.emit()" [disabled]="paginaActual() * tamanioPagina() >= total()"
              class="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">
              Siguiente
            </button>
          </div>
        </div>
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SyncHistoryTableComponent {
  sincronizaciones = input.required<SyncLogDto[]>();
  loading = input.required<boolean>();
  total = input.required<number>();
  paginaActual = input.required<number>();
  tamanioPagina = input.required<number>();

  @Output() anterior = new EventEmitter<void>();
  @Output() siguiente = new EventEmitter<void>();

  getResultadoLabel(resultado: string): { text: string; class: string } {
    return getResultadoLabel(resultado);
  }

  formatTime(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
}

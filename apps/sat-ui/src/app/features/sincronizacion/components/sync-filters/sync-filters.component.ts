import { ChangeDetectionStrategy, Component, EventEmitter, Output, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SyncLogFiltro } from '../../../../core/services/sync.service';

@Component({
  selector: 'app-sync-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-wrap gap-3 items-end">
      <div class="flex flex-col gap-1">
        <label for="fecInicio" class="text-xs text-slate-500 font-medium">Fecha Inicio</label>
        <input id="fecInicio" type="date" [(ngModel)]="filtro().fecInicio" (change)="filtroChange.emit()"
          class="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-primary"/>
      </div>
      <div class="flex flex-col gap-1">
        <label for="fecFin" class="text-xs text-slate-500 font-medium">Fecha Fin</label>
        <input id="fecFin" type="date" [(ngModel)]="filtro().fecFin" (change)="filtroChange.emit()"
          class="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-primary"/>
      </div>
      <div class="flex flex-col gap-1">
        <label for="codDispositivo" class="text-xs text-slate-500 font-medium">Dispositivo</label>
        <input id="codDispositivo" type="text" [(ngModel)]="filtro().codDispositivo" (change)="filtroChange.emit()" placeholder="Código dispositivo"
          class="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-primary w-40"/>
      </div>
      <div class="flex flex-col gap-1">
        <label for="txtResultado" class="text-xs text-slate-500 font-medium">Resultado</label>
        <select id="txtResultado" [(ngModel)]="filtro().txtResultado" (change)="filtroChange.emit()"
          class="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-primary bg-white">
          <option value="">Todos</option>
          <option value="EXITOSO">Exitoso</option>
          <option value="ERROR_PARCIAL">Error Parcial</option>
          <option value="FALLIDO">Fallido</option>
        </select>
      </div>
      <div class="flex flex-col gap-1">
        <button (click)="limpiar.emit()" 
          class="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">
          Limpiar
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SyncFiltersComponent {
  filtro = input.required<SyncLogFiltro>();

  @Output() filtroChange = new EventEmitter<void>();
  @Output() limpiar = new EventEmitter<void>();
}

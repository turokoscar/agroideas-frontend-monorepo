import { ChangeDetectionStrategy, Component, EventEmitter, Output, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UiFilterBarComponent, UIButtonComponent } from '@agroideas/ui';
import { SyncLogFiltro } from '../../../../core/services/sync.service';

@Component({
  selector: 'app-sync-filters',
  standalone: true,
  imports: [CommonModule, FormsModule, UiFilterBarComponent, UIButtonComponent],
  styles: [`:host { display: block; }`],
  template: `
    <app-ui-filter-bar [showSearch]="false" [showAdd]="false">
      <div class="filter-group">
        <label for="syncFecInicio" class="filter-label">Fecha Inicio</label>
        <input id="syncFecInicio" type="date" [(ngModel)]="filtro().fecInicio" (change)="filtroChange.emit()" class="filter-input"/>
      </div>
      <div class="filter-group">
        <label for="syncFecFin" class="filter-label">Fecha Fin</label>
        <input id="syncFecFin" type="date" [(ngModel)]="filtro().fecFin" (change)="filtroChange.emit()" class="filter-input"/>
      </div>
      <div class="filter-group">
        <label for="syncDispositivo" class="filter-label">Dispositivo</label>
        <input id="syncDispositivo" type="text" [(ngModel)]="filtro().codDispositivo" (change)="filtroChange.emit()" placeholder="Código dispositivo" class="filter-input"/>
      </div>
      <div class="filter-group">
        <label for="syncResultado" class="filter-label">Resultado</label>
        <select id="syncResultado" [(ngModel)]="filtro().txtResultado" (change)="filtroChange.emit()" class="filter-input">
          <option value="">Todos</option>
          <option value="EXITOSO">Exitoso</option>
          <option value="ERROR_PARCIAL">Error Parcial</option>
          <option value="FALLIDO">Fallido</option>
        </select>
      </div>
      <div class="filter-group" style="justify-content: flex-end;">
        <ui-button label="Limpiar" appearance="soft" severity="secondary" (onClick)="limpiar.emit()"></ui-button>
      </div>
    </app-ui-filter-bar>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SyncFiltersComponent {
  filtro = input.required<SyncLogFiltro>();

  @Output() filtroChange = new EventEmitter<void>();
  @Output() limpiar = new EventEmitter<void>();
}

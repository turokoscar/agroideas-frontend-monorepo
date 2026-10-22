import { Component, computed, input } from '@angular/core';
import { UiStatusPillComponent } from '@agroideas/ui';
import { etiquetaEstado, tonoEstado } from '../core/models/cierre.model';

/** Insignia del estado del expediente: `app-ui-status-pill` con el tono de cada estado (ADR 0014, Fase 2). */
@Component({
  selector: 'app-estado-cierre-pill',
  standalone: true,
  imports: [UiStatusPillComponent],
  template: `<app-ui-status-pill [tone]="tono()" [text]="etiqueta()" />`
})
export class EstadoCierrePillComponent {
  estado = input.required<string>();

  etiqueta = computed(() => etiquetaEstado(this.estado()));
  tono = computed(() => tonoEstado(this.estado()));
}

import { Component, computed, input } from '@angular/core';
import { claseEstado, etiquetaEstado } from '../core/models/cierre.model';

/** Insignia del estado del expediente con los tonos del tema. */
@Component({
  selector: 'app-estado-cierre-pill',
  standalone: true,
  template: `
    <span class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap" [class]="clase()">
      {{ etiqueta() }}
    </span>
  `
})
export class EstadoCierrePillComponent {
  estado = input.required<string>();

  etiqueta = computed(() => etiquetaEstado(this.estado()));
  clase = computed(() => claseEstado(this.estado()));
}

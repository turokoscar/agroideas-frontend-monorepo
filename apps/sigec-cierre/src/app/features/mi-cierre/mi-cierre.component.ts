import { Component } from '@angular/core';

/**
 * Expediente de la OA, en solo lectura. La OA no presenta nada aquí: el Anexo 20 va con el
 * último RTF en sigec-rtf (ADR 0013, D1). El detalle llega en la Fase 1.
 */
@Component({
  selector: 'app-mi-cierre',
  standalone: true,
  template: `
    <div class="space-y-6">
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-foreground">Mi cierre de convenio</h2>
        <p class="text-sm text-muted-foreground">Estado del expediente de cierre de su convenio.</p>
      </div>

      <div class="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card p-12 text-center">
        <span class="material-symbols-outlined text-[40px] text-muted-foreground">assignment</span>
        <p class="text-sm font-medium text-foreground">Su expediente de cierre se abre al enviar el RTF del último paso crítico.</p>
        <p class="text-xs text-muted-foreground">
          El Informe de Cierre del PNT (Anexo 20) se presenta junto con ese RTF en el módulo de Reporte Técnico Financiero.
        </p>
      </div>
    </div>
  `
})
export class MiCierreComponent {}

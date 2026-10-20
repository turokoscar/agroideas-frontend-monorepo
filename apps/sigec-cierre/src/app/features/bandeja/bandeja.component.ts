import { Component } from '@angular/core';

/** Bandeja del personal. El listado por semáforo llega en la Fase 1 del ADR 0013 (D4). */
@Component({
  selector: 'app-bandeja',
  standalone: true,
  template: `
    <div class="space-y-6">
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-foreground">Bandeja de expedientes</h2>
        <p class="text-sm text-muted-foreground">Expedientes de cierre que esperan una acción suya.</p>
      </div>

      <div class="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card p-12 text-center">
        <span class="material-symbols-outlined text-[40px] text-muted-foreground">inbox</span>
        <p class="text-sm font-medium text-foreground">La bandeja estará disponible próximamente.</p>
        <p class="text-xs text-muted-foreground">Aquí verá cada expediente con su plazo y la acción que le corresponde.</p>
      </div>
    </div>
  `
})
export class BandejaComponent {}

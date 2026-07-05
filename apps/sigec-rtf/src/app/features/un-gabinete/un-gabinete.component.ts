import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-un-gabinete',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold tracking-tight text-foreground">Evaluación de Gabinete</h2>
          <p class="text-sm text-muted-foreground">Especialista UN Central / Dirección Ejecutiva / USE</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-card border border-border rounded-xl p-6 shadow-sm">
          <p class="text-sm text-muted-foreground">No hay convenios pendientes de evaluación de gabinete en este momento.</p>
        </div>
      </div>
    </div>
  `
})
export class UnGabineteComponent {}

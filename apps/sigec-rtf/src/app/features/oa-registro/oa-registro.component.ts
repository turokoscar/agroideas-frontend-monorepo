import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-oa-registro',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold tracking-tight text-foreground">Registro de Avances (Anexo 17)</h2>
          <p class="text-sm text-muted-foreground">Organización Agraria - Cooperativa Agraria Cafetalera Norte</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- KPI Cards using standard classes -->
        <div class="bg-card border border-border rounded-xl p-6 space-y-2 shadow-sm">
          <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Convenio</span>
          <p class="text-lg font-bold text-foreground">CONV-AGI-2024-0473</p>
        </div>
        <div class="bg-card border border-border rounded-xl p-6 space-y-2 shadow-sm">
          <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Paso Crítico Activo</span>
          <p class="text-lg font-bold text-primary">Paso Crítico 2</p>
        </div>
        <div class="bg-card border border-border rounded-xl p-6 space-y-2 shadow-sm">
          <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado de Envío</span>
          <p class="text-lg font-bold text-warning">En Edición</p>
        </div>
      </div>
    </div>
  `
})
export class OaRegistroComponent {}

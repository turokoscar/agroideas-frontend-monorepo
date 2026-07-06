import { Component, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RtfService } from '../../core/services/rtf.service';

@Component({
  selector: 'app-reporte-financiero',
  standalone: true,
  imports: [CommonModule],
  providers: [DecimalPipe],
  template: `
    <div class="space-y-6 animate-fade-in">
      <!-- Header -->
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-foreground">Reporte Financiero (KOFIX)</h1>
        <p class="text-sm text-muted-foreground">
          Seguimiento del presupuesto general del convenio y registro cronológico de desembolsos aprobados.
        </p>
      </div>

      <!-- Overview Cards -->
      <div class="grid gap-4 sm:grid-cols-3">
        <div class="bg-surface-container-lowest border border-border p-4 rounded-xl">
          <span class="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Presupuesto Aprobado</span>
          <div class="text-xl font-bold mt-1 text-foreground">S/ {{ rtfService.budget() | number:'1.0-0' }}</div>
        </div>
        <div class="bg-surface-container-lowest border border-border p-4 rounded-xl">
          <span class="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Monto Desembolsado</span>
          <div class="text-xl font-bold mt-1 text-success">S/ {{ rtfService.disbursed() | number:'1.0-0' }}</div>
        </div>
        <div class="bg-surface-container-lowest border border-border p-4 rounded-xl">
          <span class="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Presupuesto por Ejecutar</span>
          <div class="text-xl font-bold mt-1 text-primary">S/ {{ (rtfService.budget() - rtfService.disbursed()) | number:'1.0-0' }}</div>
        </div>
      </div>

      <!-- Financial Execution Curve -->
      <div class="bg-surface-container-lowest border border-border rounded-xl p-6">
        <h2 class="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
          <span class="material-symbols-outlined text-success text-[18px]">show_chart</span>
          Curva Ejecución Financiera Acumulada
        </h2>
        
        <!-- SVG Area Chart -->
        <div class="relative w-full h-56 border-l-2 border-b-2 border-border/60 pb-2 pl-2">
          <!-- Guide lines -->
          <div class="absolute inset-0 flex flex-col justify-between text-[9px] text-muted-foreground/60 pr-2 pointer-events-none">
            <div class="border-t border-dashed border-border/20 w-full pt-1 text-right">S/ 320,000 (100%)</div>
            <div class="border-t border-dashed border-border/20 w-full pt-1 text-right">S/ 240,000 (75%)</div>
            <div class="border-t border-dashed border-border/20 w-full pt-1 text-right">S/ 160,000 (50%)</div>
            <div class="border-t border-dashed border-border/20 w-full pt-1 text-right">S/ 80,000 (25%)</div>
            <div></div>
          </div>

          <!-- Curve Graph Container -->
          <div class="absolute inset-0 pt-6 pr-4">
            <svg class="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <!-- Area under curve -->
              <path d="M 0 100 L 0 95 L 30 90 L 60 85 L 100 85 L 100 100 Z" fill="rgba(var(--color-primary-rgb, 16, 185, 129), 0.15)"></path>
              <!-- Curve Line -->
              <path d="M 0 95 L 30 90 L 60 85 L 100 85" fill="none" stroke="var(--color-success, #10b981)" stroke-width="2.5" stroke-linecap="round"></path>
              <!-- Project target line -->
              <line x1="0" y1="95" x2="100" y2="0" stroke="var(--border)" stroke-width="1" stroke-dasharray="3,3"></line>
            </svg>
          </div>
        </div>

        <!-- Legend -->
        <div class="flex items-center justify-center gap-4 mt-4 text-[10px]">
          <div class="flex items-center gap-1">
            <span class="h-0.5 w-4 bg-success inline-block"></span>
            <span class="text-muted-foreground">Ejecución Acumulada</span>
          </div>
          <div class="flex items-center gap-1">
            <span class="h-0.5 w-4 bg-border border-dashed inline-block"></span>
            <span class="text-muted-foreground">Trayectoria Programada</span>
          </div>
        </div>
      </div>

      <!-- KOFIX Log Table -->
      <div class="bg-surface-container-lowest border border-border rounded-xl overflow-hidden">
        <div class="px-5 py-4 border-b border-border bg-surface-container/10">
          <h3 class="text-xs font-bold text-foreground">Registro Detallado de Desembolsos</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-surface-container/20 border-b border-border text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                <th class="px-5 py-3">ID Transacción</th>
                <th class="px-5 py-3">Concepto / Item</th>
                <th class="px-5 py-3 text-center">Fecha Aprobación</th>
                <th class="px-5 py-3 text-right">Monto</th>
                <th class="px-5 py-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border text-foreground">
              <tr *ngFor="let d of rtfService.disbursements()" class="hover:bg-surface-container/5 transition-colors">
                <td class="px-5 py-3.5 font-mono text-[10px] text-muted-foreground">{{ d.id | uppercase }}</td>
                <td class="px-5 py-3.5 font-medium">{{ d.item }}</td>
                <td class="px-5 py-3.5 text-center text-muted-foreground">{{ d.date | date:'dd MMM yyyy':'':'es' }}</td>
                <td class="px-5 py-3.5 text-right font-bold text-primary">S/ {{ d.amount | number:'1.0-0' }}</td>
                <td class="px-5 py-3.5 text-center">
                  <span class="px-2 py-0.5 rounded-full text-[9px] font-bold text-success bg-success-soft border border-success/15 uppercase">
                    {{ d.status }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class ReporteFinancieroComponent {
  rtfService = inject(RtfService);
}

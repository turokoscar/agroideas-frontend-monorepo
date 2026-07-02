import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DonutData {
  mes: number;
  programado: number;
  ejecutado: number;
}

@Component({
  selector: 'app-reporte-mensual-donut',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reporte-mensual-donut.component.html',
  styleUrls: ['./reporte-mensual-donut.component.sass']
})
export class ReporteMensualDonutComponent {
  data = input.required<DonutData>();
  year = input.required<number>();
  onYearChange = output<number>();

  readonly minYear = 2020;
  readonly maxYear = new Date().getFullYear() + 2;

  readonly viewbox = 200;
  readonly center = this.viewbox / 2;
  readonly radius = 78;
  readonly strokeWidth = 16;
  readonly circumference = Math.round(2 * Math.PI * this.radius);

  readonly prog = computed(() => Number(this.data()?.programado) || 0);
  readonly ejec = computed(() => Number(this.data()?.ejecutado) || 0);

  readonly hasProgram = computed(() => this.prog() > 0);
  readonly hasEjecucion = computed(() => this.ejec() > 0);

  readonly displayPct = computed(() => {
    if (!this.hasProgram()) return this.hasEjecucion() ? 1 : 0;
    return Math.min(this.ejec() / this.prog(), 1);
  });

  readonly percentDisplay = computed(() => {
    if (!this.hasProgram()) return this.hasEjecucion() ? null : 0;
    return Math.round(this.displayPct() * 100);
  });

  readonly dashOffset = computed(() => this.circumference * (1 - this.displayPct()));

  readonly colorClass = computed(() => {
    if (!this.hasProgram()) return 'donut-arc--info';
    const pct = this.displayPct();
    if (pct >= 0.8) return 'donut-arc--success';
    if (pct >= 0.5) return 'donut-arc--warning';
    return 'donut-arc--danger';
  });

  readonly centerLabel = computed(() => {
    if (this.hasProgram()) return `${this.percentDisplay()}%`;
    if (this.hasEjecucion()) return 'N/P';
    return '0%';
  });

  readonly statusLabel = computed(() => {
    if (!this.hasProgram()) return this.hasEjecucion() ? 'Sin programación' : 'Sin ejecución';
    const pct = this.displayPct();
    if (pct >= 0.8) return 'Excelente';
    if (pct >= 0.5) return 'En progreso';
    return 'Atrasado';
  });

  prevYear(): void {
    const next = this.year() - 1;
    if (next >= this.minYear) this.onYearChange.emit(next);
  }

  nextYear(): void {
    const next = this.year() + 1;
    if (next <= this.maxYear) this.onYearChange.emit(next);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }
}

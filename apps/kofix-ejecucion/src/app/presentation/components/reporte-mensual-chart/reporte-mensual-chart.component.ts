import { ChangeDetectionStrategy, Component, Input, Output, EventEmitter, computed, signal, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface ReporteMensualItem {
  mes: number;
  programado: number;
  ejecutado: number;
}

@Component({
  selector: 'app-reporte-mensual-chart',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reporte-mensual-chart.component.html',
  styleUrls: ['./reporte-mensual-chart.component.sass'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReporteMensualChartComponent {
  data = input.required<ReporteMensualItem[]>();
  selectedYear = input.required<number>();
  availableYears = input<number[]>([2024, 2025, 2026, 2027]);

  @Output() onYearChange = new EventEmitter<number>();

  activeTooltip = signal<{
    index: number;
    x: number;
    y: number;
    programado: number;
    ejecutado: number;
    mesName: string;
  } | null>(null);

  readonly monthsNames = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'
  ];

  // SVG Chart Dimensions
  readonly width = 800;
  readonly height = 350;
  readonly paddingLeft = 70;
  readonly paddingRight = 30;
  readonly paddingTop = 30;
  readonly paddingBottom = 40;

  // Max value to scale Y axis
  readonly maxYVal = computed(() => {
    const vals = this.data();
    if (!vals || vals.length === 0) return 100000;
    const maxVal = Math.max(...vals.map(d => Math.max(d.programado, d.ejecutado)));
    return maxVal > 0 ? maxVal * 1.15 : 100000; // 15% padding on top
  });

  // Gridlines calculation
  readonly gridLines = computed(() => {
    const max = this.maxYVal();
    return [0, max * 0.25, max * 0.50, max * 0.75, max];
  });

  // Chart coordinate helpers
  getX(index: number): number {
    const chartWidth = this.width - this.paddingLeft - this.paddingRight;
    return this.paddingLeft + (index * chartWidth) / 11;
  }

  getY(val: number): number {
    const chartHeight = this.height - this.paddingTop - this.paddingBottom;
    return this.height - this.paddingBottom - (val * chartHeight) / this.maxYVal();
  }

  // Generate SVG path for Programado line
  readonly programadoPath = computed(() => {
    const vals = this.data();
    if (!vals || vals.length === 0) return '';
    return vals.map((d, i) => `${i === 0 ? 'M' : 'L'} ${this.getX(i)} ${this.getY(d.programado)}`).join(' ');
  });

  // Generate SVG path for Ejecutado line
  readonly ejecutadoPath = computed(() => {
    const vals = this.data();
    if (!vals || vals.length === 0) return '';
    return vals.map((d, i) => `${i === 0 ? 'M' : 'L'} ${this.getX(i)} ${this.getY(d.ejecutado)}`).join(' ');
  });

  onYearSelect(year: number): void {
    this.onYearChange.emit(year);
  }

  showTooltip(index: number, event: MouseEvent): void {
    const item = this.data()[index];
    if (!item) return;

    // Position tooltip over the month column line
    const x = this.getX(index);
    const y = Math.min(this.getY(item.programado), this.getY(item.ejecutado)) - 10;

    this.activeTooltip.set({
      index,
      x,
      y,
      programado: item.programado,
      ejecutado: item.ejecutado,
      mesName: this.monthsNames[index]
    });
  }

  hideTooltip(): void {
    this.activeTooltip.set(null);
  }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(val);
  }
}

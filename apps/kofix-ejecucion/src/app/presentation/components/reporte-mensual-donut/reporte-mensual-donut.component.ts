import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { UiChartColor, UiChartComponent, UiChartDataset } from '@agroideas/ui/chart';
import { ReporteMensualItem } from '../../../domain/models/convenio.model';

export type DonutData = ReporteMensualItem;

/** Clases literales (Tailwind no detecta clases armadas dinámicamente). */
const STATUS_PILL: Record<UiChartColor, string> = {
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  primary: 'bg-primary/10 text-primary',
  secondary: 'bg-secondary/10 text-secondary',
  tertiary: 'bg-tertiary/10 text-tertiary',
  accent: 'bg-accent/10 text-accent',
  muted: 'bg-muted text-muted-foreground'
};

@Component({
  selector: 'app-reporte-mensual-donut',
  standalone: true,
  imports: [UiChartComponent],
  templateUrl: './reporte-mensual-donut.component.html',
  styleUrls: ['./reporte-mensual-donut.component.sass'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReporteMensualDonutComponent {
  data = input.required<DonutData>();
  year = input.required<number>();

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

  readonly statusColor = computed<UiChartColor>(() => {
    if (!this.hasProgram()) return 'info';
    const pct = this.displayPct();
    if (pct >= 0.8) return 'success';
    if (pct >= 0.5) return 'warning';
    return 'danger';
  });

  readonly statusPillClass = computed(() => STATUS_PILL[this.statusColor()]);

  /** Anillo: segmento ejecutado + resto por ejecutar. Sin datos, anillo vacío. */
  readonly datasets = computed<UiChartDataset[]>(() => {
    const ejecutado = this.hasProgram() ? Math.min(this.ejec(), this.prog()) : this.ejec();
    const porEjecutar = this.hasProgram() ? Math.max(this.prog() - this.ejec(), 0) : 0;
    const vacio = !this.hasProgram() && !this.hasEjecucion();
    return [{
      label: 'Ejecución anual',
      data: vacio ? [0, 1] : [ejecutado, porEjecutar],
      color: [this.statusColor(), 'muted']
    }];
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

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }
}

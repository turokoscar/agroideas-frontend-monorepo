import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { UiChartComponent, UiChartDataset } from '@agroideas/ui/chart';
import { ReporteMensualItem } from '../../../domain/models/convenio.model';

export { ReporteMensualItem };

@Component({
  selector: 'app-reporte-mensual-chart',
  standalone: true,
  imports: [UiChartComponent],
  templateUrl: './reporte-mensual-chart.component.html',
  styleUrls: ['./reporte-mensual-chart.component.sass'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReporteMensualChartComponent {
  data = input.required<ReporteMensualItem[]>();
  selectedYear = input.required<number>();
  readonly monthsNames = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'
  ];

  /** Una posición por mes, indexada por `mes` (no por el orden de llegada). */
  readonly datasets = computed<UiChartDataset[]>(() => {
    const programado = new Array(12).fill(0);
    const ejecutado = new Array(12).fill(0);
    for (const item of this.data()) {
      const i = item.mes - 1;
      if (i < 0 || i > 11) continue;
      programado[i] = Number(item.programado) || 0;
      ejecutado[i] = Number(item.ejecutado) || 0;
    }
    return [
      { label: 'Programado', data: programado, color: 'info' },
      { label: 'Ejecutado', data: ejecutado, color: 'success' }
    ];
  });
}

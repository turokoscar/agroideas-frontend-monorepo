import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiKpiComponent } from '@agroideas/ui';
import { ResumenEjecutivo } from '../../../domain/models/convenio.model';

export type ResumenEjecutivoData = ResumenEjecutivo;

@Component({
  selector: 'app-resumen-ejecutivo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, UiKpiComponent],
  templateUrl: './resumen-ejecutivo.component.html',
  styleUrls: ['./resumen-ejecutivo.component.sass']
})
export class ResumenEjecutivoComponent {
  data = input.required<ResumenEjecutivo>();

  formatCurrency(value?: number): string {
    if (value === undefined || value === null) return 'S/ 0.00';
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value);
  }

  getPercent(ejecutado: number, programado: number): string {
    if (!programado) return '0.0%';
    const pct = (ejecutado / programado) * 100;
    return `${pct.toFixed(1)}%`;
  }

  getProgressPercent(parte: number, total: number): number {
    if (!total || total <= 0) return 0;
    return Math.min(Math.max(Math.round((parte / total) * 100), 0), 100);
  }
}

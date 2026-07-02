import { Component, Input, OnInit, signal, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ResumenEjecutivoData {
  totalConvenios: number;
  conveniosActivos: number;
  programacionAcumulada: number;
  ejecucionAcumulada: number;
  saldoDisponible: number;
}

@Component({
  selector: 'app-resumen-ejecutivo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './resumen-ejecutivo.component.html',
  styleUrls: ['./resumen-ejecutivo.component.sass']
})
export class ResumenEjecutivoComponent {
  data = input.required<ResumenEjecutivoData>();

  formatCurrency(value?: number): string {
    if (value === undefined || value === null) return 'S/ 0.00';
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value);
  }

  getPercent(ejecutado: number, programado: number): string {
    if (!programado) return '0.0%';
    const pct = (ejecutado / programado) * 100;
    return `${pct.toFixed(1)}%`;
  }
}

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RtfService, MetaFisicaDto } from '../../core/services/rtf.service';

@Component({
  selector: 'app-reporte-fisico',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reporte-fisico.component.html',
})
export class ReporteFisicoComponent {
  rtfService = inject(RtfService);

  getPercent(m: MetaFisicaDto): number {
    if (m.canEjecutada == null) return 0;
    return Math.round((m.canEjecutada / m.canProgramada) * 100);
  }
}

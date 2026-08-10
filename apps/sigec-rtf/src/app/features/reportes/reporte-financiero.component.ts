import { Component, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RtfService } from '../../core/services/rtf.service';

@Component({
  selector: 'app-reporte-financiero',
  standalone: true,
  imports: [CommonModule],
  providers: [DecimalPipe],
  templateUrl: './reporte-financiero.component.html',
})
export class ReporteFinancieroComponent {
  rtfService = inject(RtfService);
}

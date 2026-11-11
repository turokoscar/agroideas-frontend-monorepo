import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ReporteRepository } from '../../repositories/reporte.repository';
import { ReporteAvance } from '../../models/reporte/reporte-avance.model';

@Injectable({ providedIn: 'root' })
export class GetReporteAvanceMensualUseCase {
    private readonly repository = inject(ReporteRepository);

    execute(fechaInicio: string, fechaFin: string): Observable<ReporteAvance> {
        return this.repository.getAvanceMensual(fechaInicio, fechaFin);
    }
}

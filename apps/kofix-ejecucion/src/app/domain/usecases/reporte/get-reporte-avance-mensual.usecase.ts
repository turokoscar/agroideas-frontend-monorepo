import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ArchivoReporte, FormatoReporteAvance, ReporteRepository } from '../../repositories/reporte.repository';
import { ReporteAvance } from '../../models/reporte/reporte-avance.model';

@Injectable({ providedIn: 'root' })
export class GetReporteAvanceMensualUseCase {
    private readonly repository = inject(ReporteRepository);

    execute(fechaInicio: string, fechaFin: string): Observable<ReporteAvance> {
        return this.repository.getAvanceMensual(fechaInicio, fechaFin);
    }

    descargar(fechaInicio: string, fechaFin: string, formato: FormatoReporteAvance): Observable<ArchivoReporte> {
        return this.repository.descargarAvanceMensual(fechaInicio, fechaFin, formato);
    }
}

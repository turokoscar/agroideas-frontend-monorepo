import { Observable } from 'rxjs';
import { ReporteAvance } from '../models/reporte/reporte-avance.model';

export abstract class ReporteRepository {
    /** Avance mensual por región (GET /reportes/avance-mensual), meses completos entre ambas fechas (yyyy-MM-dd). */
    abstract getAvanceMensual(fechaInicio: string, fechaFin: string): Observable<ReporteAvance>;
}

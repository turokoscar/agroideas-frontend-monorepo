import { Observable } from 'rxjs';
import { ReporteAvance } from '../models/reporte/reporte-avance.model';

export type FormatoReporteAvance = 'excel' | 'pdf';

export interface ArchivoReporte {
    blob: Blob;
    nombreArchivo: string;
}

export abstract class ReporteRepository {
    /** Avance mensual por región (GET /reportes/avance-mensual), meses completos entre ambas fechas (yyyy-MM-dd). */
    abstract getAvanceMensual(fechaInicio: string, fechaFin: string): Observable<ReporteAvance>;

    /** Descarga el cuadro en .xlsx o .pdf generado por la API (ADR-028, fase 4). */
    abstract descargarAvanceMensual(fechaInicio: string, fechaFin: string, formato: FormatoReporteAvance): Observable<ArchivoReporte>;
}

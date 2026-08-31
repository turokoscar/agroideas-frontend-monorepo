import { Observable } from 'rxjs';
import { Convenio, ConvenioResumenFinanciero } from '../models/convenio.model';

export interface ConvenioFiltros {
    departamentoCodigo?: string;
    provinciaCodigo?: string;
    distritoCodigo?: string;
    periodo?: number;
    estado?: 'ACTIVO' | 'FINALIZADO';
}

/** Sin `estado`: la bandeja de Programación Vigente ya está acotada a convenios vigentes,
 * que por definición nunca son 'FINALIZADO' (ADR-022). */
export type ConvenioFiltrosVigente = Omit<ConvenioFiltros, 'estado'>;

export abstract class ConvenioRepository {
    abstract getAsignados(pagina: number, cantidad: number, busqueda?: string, filtros?: ConvenioFiltros): Observable<{ datos: Convenio[], total: number }>;
    abstract getTodos(pagina: number, cantidad: number, busqueda?: string, filtros?: ConvenioFiltros): Observable<{ datos: Convenio[], total: number }>;
    abstract getVigente(pagina: number, cantidad: number, busqueda?: string, filtros?: ConvenioFiltrosVigente): Observable<{ datos:Convenio[], total: number }>;
    abstract getEnEjecucion(pagina: number, cantidad: number, busqueda?: string): Observable<{ datos: Convenio[], total: number }>;
    abstract getById(id: number): Observable<Convenio>;
    abstract getResumenFinanciero(id: number): Observable<ConvenioResumenFinanciero>;
    abstract getCronogramasMensuales(id: number): Observable<any>;
    abstract getResumenEjecutivo(): Observable<any>;
    abstract getReporteMensual(anio: number): Observable<any>;
}

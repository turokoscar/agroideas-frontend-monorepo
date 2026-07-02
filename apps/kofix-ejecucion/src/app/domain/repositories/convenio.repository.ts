import { Observable } from 'rxjs';
import { Convenio, ConvenioResumenFinanciero } from '../models/convenio.model';

export abstract class ConvenioRepository {
    abstract getAsignados(pagina: number, cantidad: number, busqueda?: string): Observable<{ datos: Convenio[], total: number }>;
    abstract getTodos(pagina: number, cantidad: number, busqueda?: string): Observable<{ datos: Convenio[], total: number }>;
    abstract getVigente(pagina: number, cantidad: number, busqueda?: string): Observable<{ datos:Convenio[], total: number }>;
    abstract getById(id: number): Observable<Convenio>;
    abstract getResumenFinanciero(id: number): Observable<ConvenioResumenFinanciero>;
    abstract getCronogramasMensuales(id: number): Observable<any>;
    abstract getResumenEjecutivo(): Observable<any>;
    abstract getReporteMensual(anio: number): Observable<any>;
}

import { Observable } from 'rxjs';
import { Desembolso, SettlementBalance } from '../models/desembolso.model';

export abstract class DesembolsoRepository {
    abstract getByPostulante(postulanteId: number, numero?: string, tipoPagoId?: number, fechaInicio?: string, fechaFin?: string, offset?: number, limit?: number): Observable<{ items: Desembolso[], total: number }>;
    abstract getSaldoItem(itemAdjudicadoId: number): Observable<SettlementBalance>;
    abstract registrar(desembolso: Partial<Desembolso>): Observable<any>;
    abstract getPendientesRendicion(postulanteId: number): Observable<any[]>;
    abstract activarCheque(desembolsoId: number): Observable<any>;
    abstract ejecutarCierreContable(mes: number, anio: number): Observable<any>;
}

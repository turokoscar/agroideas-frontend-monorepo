import { Observable } from 'rxjs';
import { Desembolso, DesembolsoChequePendiente, DesembolsoDetalleItem, SettlementBalance } from '../models/desembolso.model';

export abstract class DesembolsoRepository {
    abstract getByPostulante(postulanteId: number, numero?: string, tipoPagoId?: number, fechaInicio?: string, fechaFin?: string, offset?: number, limit?: number): Observable<{ items: Desembolso[], total: number }>;
    abstract getSaldoItem(itemAdjudicadoId: number): Observable<SettlementBalance>;
    abstract registrar(desembolso: Partial<Desembolso>): Observable<any>;
    abstract actualizar(desembolsoId: number, desembolso: Partial<Desembolso>): Observable<any>;
    abstract anular(desembolsoId: number): Observable<any>;
    abstract getPendientesRendicion(postulanteId: number): Observable<any[]>;
    /** Bandeja del Supervisor: cheques en DEVENGADO pendientes de activar. Ver ADR-020. */
    abstract getChequesPendientesActivacion(postulanteId: number): Observable<DesembolsoChequePendiente[]>;
    /** Activa el cheque (pasa de DEVENGADO a GIRADO). `urlArchivo` es el GUID (como texto) del archivo ya subido con `uploadFile`. */
    abstract activarCheque(desembolsoId: number, urlArchivo: string): Observable<any>;
    abstract uploadFile(file: File): Observable<{ fileUrl: string }>;
    abstract ejecutarCierreContable(mes: number, anio: number): Observable<any>;
    abstract getDetalle(desembolsoId: number): Observable<DesembolsoDetalleItem[]>;
}

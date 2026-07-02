import { Observable } from 'rxjs';
import { KardexMovimiento, KardexSummary, KardexConsolidado, KardexMensual, KardexDetalleItem } from '../models/kardex.model';

export abstract class KardexRepository {
    abstract getMovimientos(
        tipo?: string,
        estado?: string,
        offset?: number,
        limit?: number
    ): Observable<{ items: KardexMovimiento[], total: number, summary: KardexSummary }>;

    abstract getConsolidado(postulanteId: number): Observable<KardexConsolidado[]>;
    abstract getResumenPorMes(postulanteId: number): Observable<KardexMensual[]>;
    abstract getDetallePorItem(postulanteId: number, itemMlId: number): Observable<KardexDetalleItem>;
    abstract getCierres(): Observable<any[]>;
}

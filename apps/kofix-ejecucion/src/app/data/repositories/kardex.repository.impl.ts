import { ResponseDto } from '@agroideas/utils';
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { KardexRepository } from '../../domain/repositories/kardex.repository';
import { KardexMovimiento, KardexSummary, KardexConsolidado, KardexMensual, KardexDetalleItem } from '../../domain/models/kardex.model';

@Injectable({
    providedIn: 'root'
})
export class KardexRepositoryImpl extends KardexRepository {
    private apiUrl = `${environment.apiEjecucion}/kardex`;

    constructor(private http: HttpClient) {
        super();
    }

    override getMovimientos(
        tipo?: string,
        estado?: string,
        offset = 0,
        limit = 10
    ): Observable<{ items: KardexMovimiento[], total: number, summary: KardexSummary }> {
        let params = new HttpParams()
            .set('offset', offset.toString())
            .set('limit', limit.toString());

        if (tipo && tipo !== 'all') params = params.set('tip_operacion', tipo);
        if (estado && estado !== 'all') params = params.set('est_estado', estado);

        return this.http.get<ResponseDto<any>>(`${this.apiUrl}/movimientos`, { params }).pipe(
            map(res => {
                const itemsList = Array.isArray(res.datos) ? res.datos : (res.datos?.items || []);
                const backendSummary = res.datos?.summary;
                const summary: KardexSummary = backendSummary ? {
                    totalMovimientos: backendSummary.totalMovimientos ?? backendSummary.TotalMovimientos ?? 0,
                    totalGastos: backendSummary.totalGastos ?? backendSummary.TotalGastos ?? 0,
                    totalIngresos: backendSummary.totalIngresos ?? backendSummary.TotalIngresos ?? 0
                } : this.calcSummary(itemsList);

                return {
                    items: itemsList.map((dto: any) => this.mapMovimiento(dto)),
                    total: res.total ?? res.datos?.total ?? 0,
                    summary
                };
            })
        );
    }

    private mapMovimiento(dto: any): KardexMovimiento {
        return {
            id: dto.id,
            convenioId: dto.convenioId,
            numeroConvenio: dto.numeroConvenio || '',
            organizacion: dto.organizacion || '',
            fecha: dto.fecha || '',
            tipo: dto.tipo || 'Gasto',
            documento: dto.documento || '',
            periodo: dto.periodo || '',
            monto: dto.monto || 0,
            saldoResultante: dto.saldoResultante || 0,
            usuario: dto.usuario || '',
            estado: dto.estado || 'Aprobado'
        };
    }

    private calcSummary(items: KardexMovimiento[]): KardexSummary {
        const totalGastos = items.filter(i => i.monto < 0).reduce((sum, i) => sum + Math.abs(i.monto), 0);
        const totalIngresos = items.filter(i => i.monto > 0).reduce((sum, i) => sum + i.monto, 0);
        return {
            totalMovimientos: items.length,
            totalGastos,
            totalIngresos
        };
    }

    override getConsolidado(postulanteId: number): Observable<KardexConsolidado[]> {
        return this.http.get<ResponseDto<KardexConsolidado[]>>(`${this.apiUrl}/consolidado/${postulanteId}`).pipe(
            map(res => res.datos || [])
        );
    }

    override getResumenPorMes(postulanteId: number): Observable<KardexMensual[]> {
        return this.http.get<ResponseDto<KardexMensual[]>>(`${this.apiUrl}/mensual/${postulanteId}`).pipe(
            map(res => res.datos || [])
        );
    }

    override getDetallePorItem(postulanteId: number, itemMlId: number): Observable<KardexDetalleItem> {
        return this.http.get<ResponseDto<KardexDetalleItem>>(`${this.apiUrl}/detalle/${postulanteId}/${itemMlId}`).pipe(
            map(res => res.datos!)
        );
    }

    override getCierres(): Observable<any[]> {
        return this.http.get<ResponseDto<any[]>>(`${environment.apiEjecucion}/cierres`).pipe(
            map(res => res.datos || [])
        );
    }
}

import { ResponseDto } from '@agroideas/utils';
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { DesembolsoRepository } from '../../domain/repositories/desembolso.repository';
import { Desembolso, SettlementBalance } from '../../domain/models/desembolso.model';
import { DesembolsoMapper } from '../mappers/desembolso.mapper';

@Injectable({
    providedIn: 'root'
})
export class DesembolsoRepositoryImpl extends DesembolsoRepository {
    private apiUrl = `${environment.apiEjecucion}/desembolsos`;

    constructor(private http: HttpClient) {
        super();
    }

    override getByPostulante(postulanteId: number, numero?: string, tipoPagoId?: number, fechaInicio?: string, fechaFin?: string, offset = 0, limit = 10): Observable<{ items: Desembolso[], total: number }> {
        let params = new HttpParams()
            .set('offset', offset.toString())
            .set('limit', limit.toString());

        if (numero) params = params.set('numero', numero);
        if (tipoPagoId) params = params.set('tipoPagoId', tipoPagoId.toString());
        if (fechaInicio) params = params.set('fechaInicio', fechaInicio);
        if (fechaFin) params = params.set('fechaFin', fechaFin);

        return this.http.get<ResponseDto<any[]>>(`${this.apiUrl}/postulante/${postulanteId}`, { params }).pipe(
            map(res => ({
                items: (res.datos || []).map((dto: any) => DesembolsoMapper.fromApi(dto)),
                total: res.total || 0
            }))
        );
    }

    override getSaldoItem(itemAdjudicadoId: number): Observable<SettlementBalance> {
        return this.http.get<ResponseDto<any>>(`${this.apiUrl}/item/${itemAdjudicadoId}/saldo`).pipe(
            map(res => DesembolsoMapper.fromSaldoApi(res.datos))
        );
    }

    override registrar(desembolso: Partial<Desembolso>): Observable<ResponseDto> {
        const request = DesembolsoMapper.toApiRequest(desembolso);
        return this.http.post<ResponseDto>(this.apiUrl, request);
    }

    override getPendientesRendicion(postulanteId: number): Observable<any[]> {
        return this.http.get<ResponseDto<any[]>>(`${this.apiUrl}/postulante/${postulanteId}/pendientes-rendicion`).pipe(
            map(res => res.datos || [])
        );
    }

    override activarCheque(desembolsoId: number): Observable<any> {
        return this.http.post<ResponseDto>(`${this.apiUrl}/${desembolsoId}/activacion-cheque`, {});
    }

    override ejecutarCierreContable(mes: number, anio: number): Observable<any> {
        const params = new HttpParams()
            .set('mes', mes.toString())
            .set('anio', anio.toString());
        return this.http.post<ResponseDto>(`${this.apiUrl}/cierres-contables`, {}, { params });
    }
}

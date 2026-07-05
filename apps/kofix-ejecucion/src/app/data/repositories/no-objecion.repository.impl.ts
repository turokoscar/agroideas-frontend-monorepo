import { ResponseDto } from '@agroideas/utils';
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { NoObjecionRepository } from '../../domain/repositories/no-objecion.repository';
import { NoObjecion, NoObjecionBalance } from '../../domain/models/no-objecion.model';
import { NoObjecionProgrammedItem } from '../../domain/models/no-objecion-programmed-item.model';
import { NoObjecionMapper } from '../mappers/no-objecion.mapper';

@Injectable({
    providedIn: 'root'
})
export class NoObjecionRepositoryImpl extends NoObjecionRepository {
    private apiUrl = `${environment.apiEjecucion}/NoObjecion`;

    constructor(private http: HttpClient) {
        super();
    }

    override getById(id: number): Observable<NoObjecion> {
        return this.http.get<ResponseDto<any>>(`${this.apiUrl}/${id}`).pipe(
            map(res => NoObjecionMapper.fromApi(res.datos))
        );
    }

    override getByPostulante(postulanteId: number, offset = 0, limit = 10, numero?: string, fechaInicio?: string, fechaFin?: string): Observable<{ items: NoObjecion[], total: number }> {
        let params = new HttpParams()
            .set('offset', offset.toString())
            .set('limit', limit.toString());

        if (numero) params = params.set('numero', numero);
        if (fechaInicio) params = params.set('fechaInicio', fechaInicio);
        if (fechaFin) params = params.set('fechaFin', fechaFin);

        return this.http.get<ResponseDto<any[]>>(`${this.apiUrl}/postulante/${postulanteId}`, { params }).pipe(
            map(res => ({
                items: (res.datos || []).map((dto: any) => NoObjecionMapper.fromApi(dto)),
                total: res.total || 0
            }))
        );
    }

    override create(noObjecion: NoObjecion): Observable<ResponseDto> {
        const request = NoObjecionMapper.toApiRequest(noObjecion);
        return this.http.post<ResponseDto>(this.apiUrl, request);
    }

    override update(id: number, noObjecion: NoObjecion): Observable<ResponseDto> {
        const request = NoObjecionMapper.toApiRequest(noObjecion);
        return this.http.put<ResponseDto>(`${this.apiUrl}/${id}`, request);
    }

    override delete(id: number): Observable<ResponseDto> {
        return this.http.delete<ResponseDto>(`${this.apiUrl}/${id}`);
    }

    override getBalances(postulanteId: number): Observable<Record<string, NoObjecionBalance>> {
        return this.http.get<ResponseDto<Record<string, any>>>(`${this.apiUrl}/postulante/${postulanteId}/balances`).pipe(
            map(res => {
                const balances: Record<string, NoObjecionBalance> = {};
                const data = res.datos;
                if (data) {
                    Object.keys(data).forEach(key => {
                        balances[key] = NoObjecionMapper.fromBalanceApi(data[key]);
                    });
                }
                return balances;
            })
        );
    }

    override getProgrammedItemsWithBalance(postulanteId: number, includeItemIds?: number[]): Observable<NoObjecionProgrammedItem[]> {
        let params = new HttpParams();
        if (includeItemIds && includeItemIds.length > 0) {
            params = params.set('includeItemIds', includeItemIds.join(','));
        }
        return this.http.get<ResponseDto<NoObjecionProgrammedItem[]>>(`${this.apiUrl}/postulante/${postulanteId}/items-programados`, { params }).pipe(
            map(res => {
                if (!res.datos || res.datos.length === 0) return [];
                return res.datos.map(d => NoObjecionMapper.fromProgrammedItemApi(d));
            })
        );
    }

    override getItemsParaDesembolso(postulanteId: number): Observable<any[]> {
        return this.http.get<ResponseDto<any[]>>(`${this.apiUrl}/postulante/${postulanteId}/items-desembolso`).pipe(
            map(res => res.datos || [])
        );
    }

    override uploadFile(file: File): Observable<{ fileUrl: string }> {
        const formData = new FormData();
        formData.append('file', file);
        return this.http.post<{ fileUrl: string }>(`${this.apiUrl}/upload`, formData);
    }

    override downloadFile(fileUrl: string): Observable<Blob> {
        return this.http.get(`${this.apiUrl}/download?fileUrl=${encodeURIComponent(fileUrl)}`, {
            responseType: 'blob'
        });
    }

    override getBandejaAprobacion(estado: string, offset = 0, limit = 10): Observable<{ items: any[], total: number }> {
        const params = new HttpParams()
            .set('estado', estado)
            .set('offset', offset.toString())
            .set('limit', limit.toString());

        return this.http.get<ResponseDto<any[]>>(`${this.apiUrl}/bandeja-aprobacion`, { params }).pipe(
            map(res => ({
                items: res.datos || [],
                total: res.total || 0
            }))
        );
    }

    override evaluar(id: number, estado: string, observacion: string): Observable<any> {
        return this.http.post<ResponseDto>(`${this.apiUrl}/${id}/evaluar`, { estado, observacion });
    }
}

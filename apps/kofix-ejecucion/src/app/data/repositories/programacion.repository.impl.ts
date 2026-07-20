import { ResponseDto } from '@agroideas/utils';
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ProgramacionRepository, ProgramacionItemsResponse } from '../../domain/repositories/programacion.repository';
import { ProgramacionItem, ProgramacionListResponse } from '../../domain/models/programacion.model';

@Injectable({
    providedIn: 'root'
})
export class ProgramacionRepositoryImpl extends ProgramacionRepository {
    private apiUrl = `${environment.apiEjecucion}/programaciones`;

    constructor(private http: HttpClient) {
        super();
    }

    override getResumen(page: number, pageSize: number, search: string, estado: string): Observable<ProgramacionListResponse> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('pageSize', pageSize.toString());
        if (search) params = params.set('search', search);
        if (estado) params = params.set('estado', estado);

        return this.http.get<ResponseDto<ProgramacionListResponse>>(`${this.apiUrl}/resumen`, { params }).pipe(
            map(res => res.datos || { items: [], total: 0 })
        );
    }

    override getByPostulante(postulanteId: number, page: number, pageSize: number): Observable<ProgramacionItemsResponse> {
        const params = new HttpParams()
            .set('page', page.toString())
            .set('pageSize', pageSize.toString())
            .set('_t', new Date().getTime().toString());
            
        return this.http.get<ResponseDto<any>>(`${this.apiUrl}/proyectos/${postulanteId}/items`, { params }).pipe(
            map(res => ({
                items: ProgramacionMapper.fromApi(res),
                total: res.total ?? 0
            }))
        );
    }

    override getCronograma(marcoLogicoId: number): Observable<any[]> {
        return this.http.get<ResponseDto<any[]>>(`${this.apiUrl}/items/${marcoLogicoId}/cronograma`).pipe(
            map(res => res.datos || [])
        );
    }

    override saveCronograma(request: any): Observable<ResponseDto> {
        return this.http.post<ResponseDto>(`${this.apiUrl}/items/cronograma`, request);
    }

    override delete(id: number): Observable<any> {
        return new Observable(obs => { obs.next(null); obs.complete(); });
    }
}

import { ProgramacionMapper } from '../mappers/programacion.mapper';
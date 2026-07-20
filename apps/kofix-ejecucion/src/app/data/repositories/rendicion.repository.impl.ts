import { ResponseDto } from '@agroideas/utils';
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RendicionRepository } from '../../domain/repositories/rendicion.repository';
import { RendicionRequest, RendicionListResponse } from '../../domain/models/rendicion.model';
import { RendicionMapper } from '../mappers/rendicion.mapper';

import { FileStorageService } from '../../shared/services/file-storage.service';

@Injectable({
    providedIn: 'root'
})
export class RendicionRepositoryImpl extends RendicionRepository {
    private apiUrl = `${environment.apiEjecucion}/rendiciones`;

    constructor(private http: HttpClient, private fileStorageService: FileStorageService) {
        super();
    }

    override getByConvenio(postulanteId: number, offset: number, limit: number, sunatCpeId?: number, numeroSolicitud?: string): Observable<RendicionListResponse> {
        let params = new HttpParams()
            .set('offset', offset.toString())
            .set('limit', limit.toString());
        
        if (sunatCpeId) {
            params = params.set('sunatCpeId', sunatCpeId.toString());
        }

        if (numeroSolicitud) {
            params = params.set('numeroSolicitud', numeroSolicitud);
        }

        return this.http.get<ResponseDto<any[]>>(`${this.apiUrl}/convenio/${postulanteId}`, { params }).pipe(
            map(res => ({
                items: RendicionMapper.fromApiList(res.datos || []),
                total: res.total || 0
            }))
        );
    }

    override create(request: RendicionRequest): Observable<any> {
        return this.http.post<any>(this.apiUrl, request);
    }

    override update(id: number, request: RendicionRequest): Observable<any> {
        return this.http.put<any>(`${this.apiUrl}/${id}`, request);
    }

    override delete(id: number): Observable<any> {
        return this.http.delete<any>(`${this.apiUrl}/${id}`);
    }

    override uploadFile(file: File): Observable<{ fileUrl: string }> {
        return this.fileStorageService.uploadFile(file, 'rendiciones');
    }

    override getPendientes(postulanteId: number): Observable<any[]> {
        return this.http.get<ResponseDto<any[]>>(`${this.apiUrl}/postulante/${postulanteId}/pendientes`).pipe(
            map(res => res.datos || [])
        );
    }
}

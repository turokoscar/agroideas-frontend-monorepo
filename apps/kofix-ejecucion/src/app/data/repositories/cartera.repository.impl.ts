import { ResponseDto } from '@agroideas/utils';
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { CarteraRepository, Especialista, ReasignarRequest } from '../../domain/repositories/cartera.repository';
import { CarteraItem } from '../../domain/models/cartera.model';

@Injectable({
    providedIn: 'root'
})
export class CarteraRepositoryImpl extends CarteraRepository {
    private apiUrl = `${environment.apiGeneral}`;
    private carteraUrl = `${environment.apiEjecucion}/cartera`;

    constructor(private http: HttpClient) {
        super();
    }

    override getCartera(
        busqueda?: string,
        offset = 0,
        limit = 10
    ): Observable<{ items: CarteraItem[], total: number }> {
        const params = new HttpParams()
            .set('busqueda', busqueda || '')
            .set('pagina', Math.floor(offset / limit) + 1)
            .set('cantidad', limit);

        return this.http.get<ResponseDto<CarteraItem[]>>(`${this.carteraUrl}`, { params }).pipe(
            map(res => ({
                items: res.datos || [],
                total: res.total || 0
            }))
        );
    }

    override getEspecialistas(): Observable<Especialista[]> {
        return this.http.get<ResponseDto<Especialista[]>>(`${this.carteraUrl}/especialistas`).pipe(
            map(res => res.datos || [])
        );
    }

    override reasignar(request: ReasignarRequest): Observable<{ exitoso: boolean; mensaje: string }> {
        return this.http.post<ResponseDto<any>>(
            `${this.carteraUrl}/${request.postulanteId}/reasignar`,
            { nuevoEspecialistaId: Number(request.nuevoEspecialistaId), observacion: request.observacion }
        ).pipe(
            map(res => ({ exitoso: !!res.exitoso, mensaje: res.mensaje || '' }))
        );
    }
}

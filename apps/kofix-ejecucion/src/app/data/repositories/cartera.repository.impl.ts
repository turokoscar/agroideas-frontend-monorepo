import { ResponseDto, isSuccess } from '@agroideas/utils';
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { CarteraFiltros, CarteraRepository, Especialista, NivelUbigeo, ReasignarRequest, Ubigeo } from '../../domain/repositories/cartera.repository';
import { CarteraItem } from '../../domain/models/cartera.model';

@Injectable({
    providedIn: 'root'
})
export class CarteraRepositoryImpl extends CarteraRepository {
    private carteraUrl = `${environment.apiEjecucion}/carteras`;

    constructor(private http: HttpClient) {
        super();
    }

    override getCartera(
        busqueda?: string,
        offset = 0,
        limit = 10,
        filtros?: CarteraFiltros
    ): Observable<{ items: CarteraItem[], total: number }> {
        let params = new HttpParams()
            .set('busqueda', busqueda || '')
            .set('pagina', Math.floor(offset / limit) + 1)
            .set('cantidad', limit);

        if (filtros?.departamentoCodigo) params = params.set('departamentoCodigo', filtros.departamentoCodigo);
        if (filtros?.provinciaCodigo) params = params.set('provinciaCodigo', filtros.provinciaCodigo);
        if (filtros?.distritoCodigo) params = params.set('distritoCodigo', filtros.distritoCodigo);
        if (filtros?.especialistaId) params = params.set('especialistaId', filtros.especialistaId);

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

    override getUbigeos(nivel: NivelUbigeo, padre?: string): Observable<Ubigeo[]> {
        let params = new HttpParams().set('nivel', nivel);
        if (padre) params = params.set('padre', padre);

        return this.http.get<ResponseDto<Ubigeo[]>>(`${this.carteraUrl}/ubigeos`, { params }).pipe(
            map(res => res.datos || [])
        );
    }

    override reasignar(request: ReasignarRequest): Observable<{ exitoso: boolean; mensaje: string }> {
        return this.http.post<ResponseDto<any>>(
            `${this.carteraUrl}/${request.postulanteId}/reasignaciones`,
            { nuevoEspecialistaId: Number(request.nuevoEspecialistaId), observacion: request.observacion }
        ).pipe(
            map(res => ({ exitoso: isSuccess(res), mensaje: res.mensaje || '' }))
        );
    }
}

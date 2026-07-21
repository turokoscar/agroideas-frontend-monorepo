import { ResponseDto } from '@agroideas/utils';
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AlertaRepository } from '../../domain/repositories/alerta.repository';
import { AlertaFilter, AlertaListResponse } from '../../domain/models/alerta.model';
import { AlertaMapper } from '../mappers/alerta.mapper';

@Injectable({
    providedIn: 'root'
})
export class AlertaRepositoryImpl extends AlertaRepository {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiEjecucion}/convenios/alertas`;

    override getAlertas(filter?: AlertaFilter): Observable<AlertaListResponse> {
        let params = new HttpParams()
            .set('pagina', (filter?.pagina ?? 1).toString())
            .set('cantidad', (filter?.cantidad ?? 10).toString());

        if (filter?.tipo) {
            params = params.set('tipo', filter.tipo);
        }
        if (filter?.severidad) {
            params = params.set('severidad', filter.severidad);
        }

        return this.http.get<ResponseDto<any>>(this.apiUrl, { params }).pipe(
            map(res => {
                const rawData = res.datos ?? {};
                const rawItems = rawData.items ?? [];
                const rawKpis = rawData.kpis ?? {};

                return {
                    kpis: AlertaMapper.fromKpisApi(rawKpis),
                    items: rawItems.map((item: any, idx: number) => AlertaMapper.fromApi(item, idx)),
                    total: res.total ?? rawKpis.totalAlertas ?? 0
                };
            })
        );
    }
}

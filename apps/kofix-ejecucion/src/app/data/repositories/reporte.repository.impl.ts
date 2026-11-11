import { ResponseDto } from '@agroideas/utils';
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ReporteRepository } from '../../domain/repositories/reporte.repository';
import { ReporteAvance } from '../../domain/models/reporte/reporte-avance.model';

@Injectable({ providedIn: 'root' })
export class ReporteRepositoryImpl extends ReporteRepository {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiEjecucion}/reportes`;

    override getAvanceMensual(fechaInicio: string, fechaFin: string): Observable<ReporteAvance> {
        const params = new HttpParams().set('fechaInicio', fechaInicio).set('fechaFin', fechaFin);
        return this.http.get<ResponseDto<ReporteAvance>>(`${this.apiUrl}/avance-mensual`, { params }).pipe(
            map(res => res.datos as ReporteAvance)
        );
    }
}

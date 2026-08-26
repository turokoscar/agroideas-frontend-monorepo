import { ResponseDto } from '@agroideas/utils';
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ConvenioRepository } from '../../domain/repositories/convenio.repository';
import { Convenio, ConvenioResumenFinanciero } from '../../domain/models/convenio.model';
import { ConvenioMapper, ConvenioDto } from '../mappers/convenio.mapper';

@Injectable({
    providedIn: 'root'
})
export class ConvenioRepositoryImpl extends ConvenioRepository {
    private apiUrl = `${environment.apiEjecucion}/convenios`;

    constructor(private http: HttpClient) {
        super();
    }

    override getAsignados(pagina: number, cantidad: number, busqueda?: string): Observable<{ datos: Convenio[], total: number }> {
        let params = new HttpParams()
            .set('pagina', pagina.toString())
            .set('cantidad', cantidad.toString());

        if (busqueda) {
            params = params.set('busqueda', busqueda);
        }

        return this.http.get<ResponseDto<ConvenioDto[]>>(`${this.apiUrl}/asignados`, { params }).pipe(
            map(res => ({
                datos: ConvenioMapper.fromApiList(res.datos || []),
                total: res.total || 0
            }))
        );
    }

    override getTodos(pagina: number, cantidad: number, busqueda?: string): Observable<{ datos: Convenio[], total: number }> {
        let params = new HttpParams()
            .set('pagina', pagina.toString())
            .set('cantidad', cantidad.toString());

        if (busqueda) {
            params = params.set('busqueda', busqueda);
        }

        return this.http.get<ResponseDto<ConvenioDto[]>>(`${this.apiUrl}/todos`, { params }).pipe(
            map(res => ({
                datos: ConvenioMapper.fromApiList(res.datos || []),
                total: res.total || 0
            }))
        );
    }

    override getVigente(pagina: number, cantidad: number, busqueda?: string): Observable<{ datos: Convenio[], total: number }> {
        let params = new HttpParams()
            .set('pagina', pagina.toString())
            .set('cantidad', cantidad.toString());

        if (busqueda) {
            params = params.set('busqueda', busqueda);
        }

        return this.http.get<ResponseDto<ConvenioDto[]>>(`${this.apiUrl}/vigentes`, { params }).pipe(
            map(res => ({
                datos: ConvenioMapper.fromApiList(res.datos || []),
                total: res.total || 0
            }))
        );
    }

    override getEnEjecucion(pagina: number, cantidad: number, busqueda?: string): Observable<{ datos: Convenio[], total: number }> {
        let params = new HttpParams()
            .set('pagina', pagina.toString())
            .set('cantidad', cantidad.toString());

        if (busqueda) {
            params = params.set('busqueda', busqueda);
        }

        return this.http.get<ResponseDto<ConvenioDto[]>>(`${this.apiUrl}/en-ejecucion`, { params }).pipe(
            map(res => ({
                datos: ConvenioMapper.fromApiList(res.datos || []),
                total: res.total || 0
            }))
        );
    }

    override getById(id: number): Observable<Convenio> {
        return this.http.get<ResponseDto<ConvenioDto>>(`${this.apiUrl}/${id}`).pipe(
            map(res => ConvenioMapper.fromApi(res.datos || {} as ConvenioDto))
        );
    }

    override getResumenFinanciero(id: number): Observable<ConvenioResumenFinanciero> {
        return this.http.get<ResponseDto<any>>(`${this.apiUrl}/${id}/resumen`).pipe(
            map(res => ({
                programacionAcumulada: res.datos?.programacionAcumulada || 0,
                ejecucionAcumulada: res.datos?.ejecucionAcumulada || 0,
                saldoDisponible: res.datos?.saldoDisponible || 0
            }))
        );
    }

    override getCronogramasMensuales(id: number): Observable<any> {
        return this.http.get<ResponseDto<any>>(`${this.apiUrl}/${id}/cronogramas-mensuales`).pipe(
            map(res => res.datos)
        );
    }

    override getResumenEjecutivo(): Observable<any> {
        return this.http.get<ResponseDto<any>>(`${this.apiUrl}/resumen-ejecutivo`).pipe(
            map(res => res.datos)
        );
    }

    override getReporteMensual(anio: number): Observable<any> {
        return this.http.get<ResponseDto<any>>(`${this.apiUrl}/reporte-mensual?anio=${anio}`).pipe(
            map(res => res.datos)
        );
    }
}

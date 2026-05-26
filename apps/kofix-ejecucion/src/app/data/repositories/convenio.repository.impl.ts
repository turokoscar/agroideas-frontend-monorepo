import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ConvenioRepository } from '../../domain/repositories/convenio.repository';
import { Convenio, ConvenioResumenFinanciero } from '../../domain/models/convenio.model';
import { ConvenioMapper } from '../mappers/convenio.mapper';
import { ResponseDto } from '../../domain/models/response-dto.model';

@Injectable({
    providedIn: 'root'
})
export class ConvenioRepositoryImpl extends ConvenioRepository {
    private apiUrl = `${environment.apiEjecucion}/convenio`;

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

        return this.http.get<ResponseDto<any[]>>(`${this.apiUrl}/asignados`, { params }).pipe(
            map(res => ({
                datos: ConvenioMapper.fromApiList(res.datos),
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

        return this.http.get<ResponseDto<any[]>>(`${this.apiUrl}/todos`, { params }).pipe(
            map(res => ({
                datos: ConvenioMapper.fromApiList(res.datos),
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

        return this.http.get<ResponseDto<any[]>>(`${this.apiUrl}/vigentes`, { params }).pipe(
            map(res => ({
                datos: ConvenioMapper.fromApiList(res.datos),
                total: res.total || 0
            }))
        );
    }

    override getById(id: number): Observable<Convenio> {
        return this.http.get<ResponseDto<any>>(`${this.apiUrl}/${id}`).pipe(
            map(res => ConvenioMapper.fromApi(res.datos))
        );
    }

    override getResumenFinanciero(id: number): Observable<ConvenioResumenFinanciero> {
        return this.http.get<ResponseDto<any>>(`${this.apiUrl}/${id}/resumen`).pipe(
            map(res => ({
                programacionAcumulada: res.datos.programacionAcumulada || 0,
                ejecucionAcumulada: res.datos.ejecucionAcumulada || 0,
                saldoDisponible: res.datos.saldoDisponible || 0
            }))
        );
    }
}

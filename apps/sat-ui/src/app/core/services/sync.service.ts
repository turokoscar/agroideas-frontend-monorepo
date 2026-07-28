import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ResponseDto } from '@agroideas/utils';
import { getResultadoLabel } from '../../shared/utils/estado-labels';


export interface SyncLogFiltro {
  ideAsistente?: string;
  fecInicio?: string;
  fecFin?: string;
  codDispositivo?: string;
  txtResultado?: string;
  pagina?: number;
  tamanioPagina?: number;
}

export interface SyncLogDto {
  ideSyncLog: number;
  ideAsistente: string;
  txtAsistente: string;
  codDispositivo: string;
  fecSync: string;
  totalActividades: number;
  totalEvidencias: number;
  actividadesExitosas: number;
  evidenciasExitosas: number;
  actividadesConError: number;
  txtResultado: string;
  txtIpOrigen: string;
}

export interface SyncLogPaginacion {
  items: SyncLogDto[];
  total: number;
  pagina: number;
  tamanioPagina: number;
}

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  private _loading = signal(false);
  loading = this._loading.asReadonly();

  private construirParams(filtro: SyncLogFiltro): HttpParams {
    let params = new HttpParams();
    if (filtro.ideAsistente) params = params.set('ideAsistente', filtro.ideAsistente);
    if (filtro.fecInicio) params = params.set('fecInicio', filtro.fecInicio);
    if (filtro.fecFin) params = params.set('fecFin', filtro.fecFin);
    if (filtro.codDispositivo) params = params.set('codDispositivo', filtro.codDispositivo);
    if (filtro.txtResultado) params = params.set('txtResultado', filtro.txtResultado);
    params = params.set('pagina', (filtro.pagina ?? 1).toString());
    params = params.set('tamanioPagina', (filtro.tamanioPagina ?? 20).toString());
    return params;
  }

  obtenerHistorial(filtro: SyncLogFiltro = {}): Observable<SyncLogPaginacion> {
    this._loading.set(true);
    const params = this.construirParams(filtro);
    return this.http.get<ResponseDto>(`${this.apiUrl}/sincronizaciones/logs`, { params }).pipe(
      map(res => {
        this._loading.set(false);
        if (res.respuesta === 'OK' && res.datos) {
          return res.datos as SyncLogPaginacion;
        }
        return { items: [], total: 0, pagina: 1, tamanioPagina: 20 };
      })
    );
  }

  getResultadoLabel(resultado: string): { text: string; class: string } {
    return getResultadoLabel(resultado);
  }
}
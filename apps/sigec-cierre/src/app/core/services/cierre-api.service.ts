import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of, OperatorFunction } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse, DatosPaginados } from '../models/api.model';
import {
  AuditoriaCierreDto,
  CierreDetalleDto,
  CierreDto,
  ExpedientePendienteDto,
  ListarCierresFiltro,
  ResultadoAperturaDto
} from '../models/cierre.model';
import { PlazoDto } from '../models/plazo.model';
import { EnvioNotificacionDto } from '../models/notificacion.model';

/**
 * Desenvuelve el sobre MIDAGRI. La API responde los errores con su código HTTP (llegan como
 * `HttpErrorResponse`); si alguno viniera con 200 y `respuesta: 'ERROR'`, se relanza con la misma
 * forma (`{ error: sobre }`) para que `mensajeParaUsuario` lo lea igual (ADR 0013, D5).
 */
export function desenvolver<T>(): OperatorFunction<ApiResponse<T>, T> {
  return map(res => {
    if (res?.respuesta !== 'OK') {
      throw { error: res };
    }
    return res.datos as T;
  });
}

/** Cliente de `sigec-api-cierre` (prefijo `api/v1`) para la bandeja y el expediente. */
@Injectable({ providedIn: 'root' })
export class CierreApiService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private paginacion = environment.paginacion;

  listarPendientes(pagina = 1, cantidad = this.paginacion.cantidadMaxima): Observable<DatosPaginados<ExpedientePendienteDto>> {
    const params = new HttpParams().set('pagina', pagina).set('cantidad', cantidad);
    return this.http
      .get<ApiResponse<DatosPaginados<ExpedientePendienteDto>>>(`${this.apiUrl}/cierres/pendientes`, { params })
      .pipe(desenvolver());
  }

  /**
   * Toda la bandeja del usuario. Suele caber en una página; si no, pide el resto en paralelo
   * para que los contadores por semáforo sean exactos (ADR 0013, D4).
   */
  listarTodosLosPendientes(): Observable<ExpedientePendienteDto[]> {
    return this.listarPendientes(1).pipe(
      switchMap(primera => {
        const paginas = Math.ceil(primera.total / this.paginacion.cantidadMaxima);
        if (paginas <= 1) return of(primera.items);
        const resto = Array.from({ length: paginas - 1 }, (_, i) => this.listarPendientes(i + 2));
        return forkJoin(resto).pipe(map(siguientes => [...primera.items, ...siguientes.flatMap(p => p.items)]));
      })
    );
  }

  listar(filtro: ListarCierresFiltro = {}): Observable<DatosPaginados<CierreDto>> {
    let params = new HttpParams().set('pagina', filtro.pagina ?? 1).set('cantidad', filtro.cantidad ?? this.paginacion.cantidadPorPagina);
    if (filtro.ideConvenio) params = params.set('ideConvenio', filtro.ideConvenio);
    if (filtro.estado) params = params.set('estado', filtro.estado);
    return this.http.get<ApiResponse<DatosPaginados<CierreDto>>>(`${this.apiUrl}/cierres`, { params }).pipe(desenvolver());
  }

  obtener(ideCierreConvenio: number): Observable<CierreDetalleDto> {
    return this.http.get<ApiResponse<CierreDetalleDto>>(`${this.apiUrl}/cierres/${ideCierreConvenio}`).pipe(desenvolver());
  }

  listarPlazos(ideCierreConvenio: number): Observable<PlazoDto[]> {
    return this.http.get<ApiResponse<PlazoDto[]>>(`${this.apiUrl}/cierres/${ideCierreConvenio}/plazos`).pipe(desenvolver());
  }

  listarAuditorias(ideCierreConvenio: number): Observable<AuditoriaCierreDto[]> {
    return this.http
      .get<ApiResponse<AuditoriaCierreDto[]>>(`${this.apiUrl}/cierres/${ideCierreConvenio}/auditorias`)
      .pipe(desenvolver());
  }

  /** Constancia de correos del expediente. Solo para el personal (la API responde 403 a la OA). */
  listarEnvios(ideCierreConvenio: number): Observable<EnvioNotificacionDto[]> {
    return this.http
      .get<ApiResponse<EnvioNotificacionDto[]>>(`${this.apiUrl}/cierres/${ideCierreConvenio}/envios`)
      .pipe(desenvolver());
  }

  /** PDF vigente del tipo indicado (`ANEXO_20`, `RDE`…). */
  descargarDocumento(ideCierreConvenio: number, tipoDocumento: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/cierres/${ideCierreConvenio}/documentos/${tipoDocumento}`, { responseType: 'blob' });
  }

  /** Apertura manual por la UN (`POST /cierres`). 409 con el motivo si aún no corresponde. */
  iniciar(ideConvenio: number): Observable<ResultadoAperturaDto> {
    return this.http.post<ApiResponse<ResultadoAperturaDto>>(`${this.apiUrl}/cierres`, { ideConvenio }).pipe(desenvolver());
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of, OperatorFunction, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
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
import { Anexo21Datos, Anexo21Dto } from '../models/anexo21.model';
import { Anexo22Datos, Anexo22Dto, RequisitosDerivacionDto, VersionAnexo22Dto } from '../models/anexo22.model';
import { ObservacionUajDto } from '../models/revision-legal.model';

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
    return this.http
      .get(`${this.apiUrl}/cierres/${ideCierreConvenio}/documentos/${tipoDocumento}`, { responseType: 'blob' })
      .pipe(catchError(leerErrorBlob));
  }

  // --- Acta de Cierre (Anexo 21) y verificación de campo (Fase 2) ---

  obtenerAnexo21(ideCierreConvenio: number): Observable<Anexo21Dto> {
    return this.http.get<ApiResponse<Anexo21Dto>>(`${this.apiUrl}/cierres/${ideCierreConvenio}/anexos21`).pipe(desenvolver());
  }

  /** Guarda el borrador (puede ir incompleto). La API repone los datos del SEL y de KOFIX. */
  guardarAnexo21(ideCierreConvenio: number, datos: Anexo21Datos): Observable<Anexo21Dto> {
    return this.http
      .put<ApiResponse<Anexo21Dto>>(`${this.apiUrl}/cierres/${ideCierreConvenio}/anexos21`, datos)
      .pipe(desenvolver());
  }

  /** PDF/A del acta para imprimir y firmar a mano (lo que falta sale en blanco). */
  descargarAnexo21(ideCierreConvenio: number): Observable<Blob> {
    return this.http
      .get(`${this.apiUrl}/cierres/${ideCierreConvenio}/anexos21/documento`, { responseType: 'blob' })
      .pipe(catchError(leerErrorBlob));
  }

  /** Registra la verificación con el acta escaneada; el expediente pasa a EN_EVALUACION_UN. */
  registrarVerificacion(ideCierreConvenio: number, actaFirmada: File): Observable<CierreDto> {
    const formulario = new FormData();
    formulario.append('archivo', actaFirmada);
    return this.http
      .post<ApiResponse<CierreDto>>(`${this.apiUrl}/cierres/${ideCierreConvenio}/verificaciones`, formulario)
      .pipe(desenvolver());
  }

  // --- Informe de Evaluación (Anexo 22) y derivación a la DE (Fase 3) ---

  obtenerAnexo22(ideCierreConvenio: number): Observable<Anexo22Dto> {
    return this.http.get<ApiResponse<Anexo22Dto>>(`${this.apiUrl}/cierres/${ideCierreConvenio}/anexos22`).pipe(desenvolver());
  }

  /** Guarda el borrador (puede ir incompleto). La API repone lo que viene del SEL, RTF y KOFIX. */
  guardarAnexo22(ideCierreConvenio: number, datos: Anexo22Datos): Observable<Anexo22Dto> {
    return this.http
      .put<ApiResponse<Anexo22Dto>>(`${this.apiUrl}/cierres/${ideCierreConvenio}/anexos22`, datos)
      .pipe(desenvolver());
  }

  /** PDF/A del Anexo 22 para firmarlo (exige el formulario completo). */
  descargarAnexo22(ideCierreConvenio: number): Observable<Blob> {
    return this.http
      .get(`${this.apiUrl}/cierres/${ideCierreConvenio}/anexos22/documento`, { responseType: 'blob' })
      .pipe(catchError(leerErrorBlob));
  }

  /** Presenta el Anexo 22 firmado: queda FIRMADO y el expediente puede elevarse a la DE. */
  presentarAnexo22(ideCierreConvenio: number, pdfFirmado: File): Observable<CierreDto> {
    const formulario = new FormData();
    formulario.append('archivo', pdfFirmado);
    return this.http
      .post<ApiResponse<CierreDto>>(`${this.apiUrl}/cierres/${ideCierreConvenio}/anexos22`, formulario)
      .pipe(desenvolver());
  }

  listarVersionesAnexo22(ideCierreConvenio: number): Observable<VersionAnexo22Dto[]> {
    return this.http
      .get<ApiResponse<VersionAnexo22Dto[]>>(`${this.apiUrl}/cierres/${ideCierreConvenio}/anexos22/versiones`)
      .pipe(desenvolver());
  }

  /** Requisitos para elevar el expediente a la DE (Anexo 22 firmado, último RTF aprobado) y si exigirá contingencia. */
  obtenerRequisitosDerivacion(ideCierreConvenio: number): Observable<RequisitosDerivacionDto> {
    return this.http
      .get<ApiResponse<RequisitosDerivacionDto>>(`${this.apiUrl}/cierres/${ideCierreConvenio}/derivaciones/requisitos`)
      .pipe(desenvolver());
  }

  /**
   * Deriva el expediente: `DE` (la UN eleva; exige Anexo 22 firmado, último RTF aprobado y contingencia si
   * venció el plazo de la UN) o `UAJ` (la DE traslada; Fase 4).
   */
  derivar(ideCierreConvenio: number, destino: 'DE' | 'UAJ', txtContingencia: string | null = null): Observable<CierreDto> {
    return this.http
      .post<ApiResponse<CierreDto>>(`${this.apiUrl}/cierres/${ideCierreConvenio}/derivaciones`, { destino, txtContingencia })
      .pipe(desenvolver());
  }

  // --- Revisión legal, subsanación y RDE (Fase 4) ---

  /** Observaciones de todas las rondas con sus respuestas (solo personal; la API responde 403 a la OA). */
  listarObservaciones(ideCierreConvenio: number): Observable<ObservacionUajDto[]> {
    return this.http
      .get<ApiResponse<ObservacionUajDto[]>>(`${this.apiUrl}/cierres/${ideCierreConvenio}/observaciones`)
      .pipe(desenvolver());
  }

  /** La UAJ observa: el expediente vuelve a la UN y el Anexo 22 se reabre como versión nueva. */
  observar(ideCierreConvenio: number, observaciones: string[]): Observable<CierreDto> {
    return this.http
      .post<ApiResponse<CierreDto>>(`${this.apiUrl}/cierres/${ideCierreConvenio}/observaciones`, { observaciones })
      .pipe(desenvolver());
  }

  /** La UN responde todas las observaciones de la última ronda y eleva de nuevo a la DE (exige el Anexo 22 nuevo firmado). */
  subsanar(ideCierreConvenio: number, respuestas: { ideObservacion: number; txtRespuesta: string }[]): Observable<CierreDto> {
    return this.http
      .post<ApiResponse<CierreDto>>(`${this.apiUrl}/cierres/${ideCierreConvenio}/subsanaciones`, { respuestas })
      .pipe(desenvolver());
  }

  /** La UAJ remite el Informe Legal y el Proyecto de RDE (multipart: `informeLegal`, `proyectoRde`). */
  remitirProyectoRde(ideCierreConvenio: number, informeLegal: File, proyectoRde: File): Observable<CierreDto> {
    const formulario = new FormData();
    formulario.append('informeLegal', informeLegal);
    formulario.append('proyectoRde', proyectoRde);
    return this.http
      .post<ApiResponse<CierreDto>>(`${this.apiUrl}/cierres/${ideCierreConvenio}/proyectos-rde`, formulario)
      .pipe(desenvolver());
  }

  /** La DE carga la RDE suscrita: el expediente queda CERRADO y se registra el estado 77 en el SEL. */
  suscribirRde(ideCierreConvenio: number, txtNumeroRde: string, fecEmisionRde: string, rde: File): Observable<CierreDto> {
    const formulario = new FormData();
    formulario.append('txtNumeroRde', txtNumeroRde);
    formulario.append('fecEmisionRde', fecEmisionRde);
    formulario.append('archivo', rde);
    return this.http
      .post<ApiResponse<CierreDto>>(`${this.apiUrl}/cierres/${ideCierreConvenio}/rdes`, formulario)
      .pipe(desenvolver());
  }

  /** Cargo de la entrega física de la RDE (la DE, con el expediente CERRADO). */
  registrarCargoNotificacion(ideCierreConvenio: number, cargo: File): Observable<unknown> {
    const formulario = new FormData();
    formulario.append('tipoDocumento', 'CARGO_NOTIFICACION_RDE');
    formulario.append('archivo', cargo);
    return this.http
      .post<ApiResponse<unknown>>(`${this.apiUrl}/cierres/${ideCierreConvenio}/documentos`, formulario)
      .pipe(desenvolver());
  }

  /** Reintenta registrar el estado 77 en el SEL (la DE, si quedó pendiente). */
  reintentarSincronizacionSel(ideCierreConvenio: number): Observable<CierreDto> {
    return this.http
      .post<ApiResponse<CierreDto>>(`${this.apiUrl}/cierres/${ideCierreConvenio}/sincronizaciones-sel`, {})
      .pipe(desenvolver());
  }

  /** Apertura manual por la UN (`POST /cierres`). 409 con el motivo si aún no corresponde. */
  iniciar(ideConvenio: number): Observable<ResultadoAperturaDto> {
    return this.http.post<ApiResponse<ResultadoAperturaDto>>(`${this.apiUrl}/cierres`, { ideConvenio }).pipe(desenvolver());
  }
}

/**
 * Con `responseType: 'blob'` el sobre de error de la API también llega como Blob. Se lee y se relanza
 * con la forma `{ status, error: sobre }`, para que `mensajeParaUsuario` muestre su mensaje.
 */
export function leerErrorBlob(err: HttpErrorResponse): Observable<never> {
  if (!(err?.error instanceof Blob)) return throwError(() => err);
  return leerTexto(err.error).pipe(switchMap(texto => throwError(() => ({ status: err.status, error: comoJson(texto) }))));
}

/** Texto de un Blob con FileReader (`Blob.text()` no existe en todos los entornos, p. ej. jsdom). */
function leerTexto(blob: Blob): Observable<string> {
  return new Observable<string>(suscriptor => {
    const lector = new FileReader();
    lector.onload = () => {
      suscriptor.next(String(lector.result ?? ''));
      suscriptor.complete();
    };
    lector.onerror = () => {
      suscriptor.next('');
      suscriptor.complete();
    };
    lector.readAsText(blob);
  });
}

function comoJson(texto: string): unknown {
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

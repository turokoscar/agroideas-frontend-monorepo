import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Anexo20Datos, Anexo20Dto, ApiResponse, ExpedienteCierreDto, PlazoCierreDto } from '../models';

/**
 * Cliente de sigec-api-cierre para la OA (ADR 0013 del monorepo, Fase A): el Anexo 20 se llena aquí,
 * junto con el RTF del último paso crítico, y el dashboard muestra el estado del expediente de cierre.
 * `ideConvenio` es el `postulanteId` de BD_SEL. La API limita a la OA a su propio convenio.
 */
@Injectable({ providedIn: 'root' })
export class CierreService {
  private http = inject(HttpClient);
  private apiUrl = environment.cierre.apiUrl;

  obtenerAnexo20(ideConvenio: number): Observable<Anexo20Dto> {
    return this.http
      .get<ApiResponse<Anexo20Dto>>(`${this.apiUrl}/convenios/${ideConvenio}/anexos20`)
      .pipe(map(res => res.datos as Anexo20Dto));
  }

  /** Guarda el borrador (puede ir incompleto). Devuelve el anexo con sus `faltantes` recalculados. */
  guardarAnexo20(ideConvenio: number, datos: Anexo20Datos): Observable<Anexo20Dto> {
    return this.http
      .put<ApiResponse<Anexo20Dto>>(`${this.apiUrl}/convenios/${ideConvenio}/anexos20`, datos)
      .pipe(map(res => res.datos as Anexo20Dto));
  }

  /**
   * PDF/A oficial del Anexo 20 para firmarlo. Si falta algo, la API responde 400 con el sobre en un
   * Blob (por el `responseType`); se convierte a la forma `{ error: sobre }` para que el componente
   * muestre el mensaje con `mensajeParaUsuario`.
   */
  descargarAnexo20(ideConvenio: number): Observable<Blob> {
    return this.http
      .get(`${this.apiUrl}/convenios/${ideConvenio}/anexos20/documento`, { responseType: 'blob' })
      .pipe(catchError((err: HttpErrorResponse) => leerErrorBlob(err)));
  }

  /** Expediente de cierre del convenio, o null si aún no se abre. */
  obtenerExpediente(ideConvenio: number): Observable<ExpedienteCierreDto | null> {
    const params = new HttpParams().set('ideConvenio', ideConvenio).set('pagina', 1).set('cantidad', 1);
    return this.http
      .get<ApiResponse<{ total: number; items: ExpedienteCierreDto[] }>>(`${this.apiUrl}/cierres`, { params })
      .pipe(map(res => res.datos?.items[0] ?? null));
  }

  listarPlazos(ideCierreConvenio: number): Observable<PlazoCierreDto[]> {
    return this.http
      .get<ApiResponse<PlazoCierreDto[]>>(`${this.apiUrl}/cierres/${ideCierreConvenio}/plazos`)
      .pipe(map(res => res.datos ?? []));
  }
}

function leerErrorBlob(err: HttpErrorResponse): Observable<never> {
  if (!(err.error instanceof Blob)) return throwError(() => err);
  return leerTexto(err.error).pipe(switchMap(texto => throwError(() => ({ status: err.status, error: comoJson(texto) }))));
}

/** Texto de un Blob con FileReader (Blob.text() no existe en todos los entornos, p. ej. jsdom). */
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

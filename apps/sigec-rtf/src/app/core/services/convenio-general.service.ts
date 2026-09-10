import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { of, Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse, ConvenioResumenDto, DatosPaginados } from '../models';

/**
 * sigec-api-rtf no tiene datos de organización (RUC/razón social/número de convenio) — esa
 * fuente vive en sel-api-general. El JWT de sesión de sigec-rtf es válido ahí sin config extra
 * (mismo issuer/audience que sel-api-seguridad).
 */
@Injectable({
  providedIn: 'root'
})
export class ConvenioGeneralService {
  private http = inject(HttpClient);
  private apiGeneral = environment.apiGeneral;

  /**
   * Trae TODOS los convenios asignados al usuario autenticado en una sola llamada (no hay
   * endpoint por lista de ids en sel-api-general, pero sí uno de colección ya scopeado al
   * usuario del JWT — el mismo que usa sigec-api-rtf internamente, en
   * RtfCabeceraServicio.ObtenerConveniosAsignadosAsync, para filtrar RTFs por convenio). Evita
   * N requests (uno por convenio) al no depender de ideConvenio como parámetro de ruta.
   * Cantidad tope de la API: 2000.
   */
  obtenerAsignados(cantidad = 2000): Observable<Map<number, ConvenioResumenDto>> {
    return this.http.get<ApiResponse<DatosPaginados<ConvenioResumenDto>>>(
      `${this.apiGeneral}/convenios/asignados`,
      { params: { pagina: 1, cantidad } }
    ).pipe(
      map(res => {
        const mapa = new Map<number, ConvenioResumenDto>();
        (res.datos?.items ?? []).forEach(c => mapa.set(c.id, c));
        return mapa;
      }),
      catchError(err => {
        console.error('Error obteniendo convenios asignados de sel-api-general', err);
        return of(new Map<number, ConvenioResumenDto>());
      })
    );
  }
}

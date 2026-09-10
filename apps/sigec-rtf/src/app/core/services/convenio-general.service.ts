import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of, Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse, ConvenioResumenDto } from '../models';

/**
 * sigec-api-rtf no tiene datos de organización (RUC/razón social/número de convenio) — esa
 * fuente vive en sel-api-general. El JWT de sesión de sigec-rtf es válido ahí sin config extra
 * (mismo issuer/audience que sel-api-seguridad), y `postulanteId` en sel-api-general es el
 * mismo id que `ideConvenio` en sigec-api-rtf.
 */
@Injectable({
  providedIn: 'root'
})
export class ConvenioGeneralService {
  private http = inject(HttpClient);
  private apiGeneral = environment.apiGeneral;

  private obtenerConvenio(id: number): Observable<ConvenioResumenDto | null> {
    return this.http.get<ApiResponse<ConvenioResumenDto>>(`${this.apiGeneral}/convenios/${id}`).pipe(
      map(res => res.datos ?? null),
      catchError(err => {
        console.error(`Error obteniendo convenio ${id} de sel-api-general`, err);
        return of(null);
      })
    );
  }

  /**
   * No existe endpoint por lote en sel-api-general: dispara una petición por id en paralelo.
   * Pensado para invocarse solo con los ids visibles en la página actual (no la lista completa).
   */
  obtenerResumenPorIds(ids: number[]): Observable<Map<number, ConvenioResumenDto>> {
    if (ids.length === 0) {
      return of(new Map());
    }
    return forkJoin(ids.map(id => this.obtenerConvenio(id))).pipe(
      map(resultados => {
        const mapa = new Map<number, ConvenioResumenDto>();
        resultados.forEach((convenio, i) => {
          if (convenio) mapa.set(ids[i], convenio);
        });
        return mapa;
      })
    );
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { of, Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse, ConvenioResumenDto } from '../models';

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
   * Resuelve datos de presentación (RUC/razón social/número) para una lista de ideConvenio ya
   * conocida — sin scope de cartera de usuario. Antes se reutilizaba `convenios/asignados`
   * ("mi cartera"), que devolvía cero filas para un Administrador del sistema (no tiene
   * convenios asignados personalmente), dejando esas filas sin formatear en pantalla — ver
   * ADR-013. `convenios/por-ids` es un lookup genérico, sin ese problema.
   */
  obtenerPorIds(ids: number[]): Observable<Map<number, ConvenioResumenDto>> {
    if (ids.length === 0) {
      return of(new Map<number, ConvenioResumenDto>());
    }

    return this.http.get<ApiResponse<ConvenioResumenDto[]>>(
      `${this.apiGeneral}/convenios/por-ids`,
      { params: { ids: ids.join(',') } }
    ).pipe(
      map(res => {
        const mapa = new Map<number, ConvenioResumenDto>();
        (res.datos ?? []).forEach(c => mapa.set(c.id, c));
        return mapa;
      }),
      catchError(err => {
        console.error('Error obteniendo convenios por ids de sel-api-general', err);
        return of(new Map<number, ConvenioResumenDto>());
      })
    );
  }
}

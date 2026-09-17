import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  PasoCriticoMeta,
  PasoCriticoIndicador,
  ApiResponse,
  AvanceFinancieroPasoCriticoDto
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class PasoCriticoService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // ADR-002 — Metas BD_SEL state
  pasoCriticoMetas = signal<PasoCriticoMeta[]>([]);
  pasoCriticoId = signal<number | null>(null);

  // ADR-003 — Indicadores BD_SEL state
  pasoCriticoIndicadores = signal<PasoCriticoIndicador[]>([]);

  // Programado/Ejecutado financiero acotado al Paso Crítico (mismo denominador que usan las
  // metas físicas arriba) — distinto de RtfService.budget()/disbursed(), que son totales del
  // convenio completo.
  avanceFinancieroPC = signal<AvanceFinancieroPasoCriticoDto | null>(null);

  // ADR-002 — Metas físicas/financieras desde BD_SEL vía sel-api-general (programado);
  // el avance ejecutado se fusiona localmente por RTF cuando se pasa ideRtf (ADR-009).
  loadMetasPorPasoCritico(pasoCriticoId: number, ideRtf?: number | null) {
    this.pasoCriticoId.set(pasoCriticoId);
    const params = ideRtf ? `?ideRtf=${ideRtf}` : '';
    return this.http.get<ApiResponse<PasoCriticoMeta[]>>(`${this.apiUrl}/pasos-criticos/${pasoCriticoId}/metas${params}`).pipe(
      map(res => {
        this.pasoCriticoMetas.set(res.datos || []);
        return res.datos;
      }),
      catchError(err => {
        console.error('Error loading metas BD_SEL', err);
        return throwError(() => err);
      })
    );
  }

  // El backend resuelve `ideConvenio` server-side para quien no es personal MIDAGRI (ignora lo
  // que se envíe aquí), así que para la OA basta con pasar el suyo propio si ya se conoce.
  loadAvanceFinancieroPasoCritico(pasoCriticoId: number, ideConvenio: number) {
    return this.http.get<ApiResponse<AvanceFinancieroPasoCriticoDto>>(`${this.apiUrl}/pasos-criticos/${pasoCriticoId}/avance-financiero?ideConvenio=${ideConvenio}`).pipe(
      map(res => {
        this.avanceFinancieroPC.set(res.datos || null);
        return res.datos;
      }),
      catchError(err => {
        console.error('Error loading avance financiero del paso crítico', err);
        return throwError(() => err);
      })
    );
  }

  // ADR-009: el avance ejecutado se guarda localmente, ligado al RTF — ya no se empuja a BD_SEL.
  actualizarEjecucionMeta(metaId: number, ideRtf: number, metaFisicaEjecutada: number, metaFinancieraEjecutada: number, comentarios?: string) {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/pasos-criticos/metas/${metaId}/ejecucion?ideRtf=${ideRtf}`, {
      metaFisicaEjecutada,
      metaFinancieraEjecutada,
      comentarios
    }).pipe(
      map(res => res.respuesta === 'OK'),
      catchError(err => {
        console.error('Error updating ejecucion meta', err);
        return throwError(() => err);
      })
    );
  }

  subirEvidenciaMeta(metaId: number, ideRtf: number, archivo: File) {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/pasos-criticos/metas/${metaId}/evidencia?ideRtf=${ideRtf}`, formData).pipe(
      map(res => res.respuesta === 'OK'),
      catchError(err => {
        console.error('Error uploading evidencia meta', err);
        return throwError(() => err);
      })
    );
  }

  // ADR-003 — Indicadores desde BD_SEL (programado); avance ejecutado fusionado localmente (ADR-009)
  loadIndicadoresPorPasoCritico(pasoCriticoId: number, ideRtf?: number | null) {
    const params = ideRtf ? `?ideRtf=${ideRtf}` : '';
    return this.http.get<ApiResponse<PasoCriticoIndicador[]>>(`${this.apiUrl}/pasos-criticos/${pasoCriticoId}/indicadores${params}`).pipe(
      map(res => {
        this.pasoCriticoIndicadores.set(res.datos || []);
        return res.datos;
      }),
      catchError(err => {
        console.error('Error loading indicadores BD_SEL', err);
        return throwError(() => err);
      })
    );
  }

  actualizarEjecucionIndicador(id: number, ideRtf: number, metaProgramada: number, metaEjecutada: number, comentarios?: string) {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/pasos-criticos/indicadores/${id}/ejecucion?ideRtf=${ideRtf}`, {
      metaProgramada,
      metaEjecutada,
      comentarios
    }).pipe(
      map(res => res.respuesta === 'OK'),
      catchError(err => {
        console.error('Error updating ejecucion indicador', err);
        return throwError(() => err);
      })
    );
  }

  subirEvidenciaIndicador(indicadorId: number, ideRtf: number, archivo: File) {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/pasos-criticos/indicadores/${indicadorId}/evidencia?ideRtf=${ideRtf}`, formData).pipe(
      map(res => res.respuesta === 'OK'),
      catchError(err => {
        console.error('Error uploading evidencia indicador', err);
        return throwError(() => err);
      })
    );
  }
}

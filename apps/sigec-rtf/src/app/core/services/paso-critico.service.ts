import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  PasoCriticoMeta,
  PasoCriticoIndicador,
  ApiResponse
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

  // ADR-002 — Metas físicas/financieras desde BD_SEL vía sel-api-general
  loadMetasPorPasoCritico(pasoCriticoId: number) {
    this.pasoCriticoId.set(pasoCriticoId);
    return this.http.get<ApiResponse<PasoCriticoMeta[]>>(`${this.apiUrl}/rtfs/paso-critico/${pasoCriticoId}/metas`).pipe(
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

  actualizarEjecucionMeta(metaId: number, metaFisicaEjecutada: number, metaFinancieraEjecutada: number, comentarios?: string) {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/rtfs/paso-critico/metas/${metaId}`, {
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

  subirEvidenciaMeta(pasoCriticoId: number, metaId: number, archivo: File) {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/rtfs/paso-critico/${pasoCriticoId}/metas/${metaId}/evidencia`, formData).pipe(
      map(res => res.respuesta === 'OK'),
      catchError(err => {
        console.error('Error uploading evidencia meta', err);
        return throwError(() => err);
      })
    );
  }

  // ADR-003 — Indicadores desde BD_SEL
  loadIndicadoresPorPasoCritico(pasoCriticoId: number) {
    return this.http.get<ApiResponse<PasoCriticoIndicador[]>>(`${this.apiUrl}/rtfs/paso-critico/${pasoCriticoId}/indicadores`).pipe(
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

  actualizarEjecucionIndicador(id: number, metaProgramada: number, metaEjecutada: number, comentarios?: string) {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/rtfs/paso-critico/indicadores/${id}`, {
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

  subirEvidenciaIndicador(pasoCriticoId: number, indicadorId: number, archivo: File) {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/rtfs/paso-critico/${pasoCriticoId}/indicadores/${indicadorId}/evidencia`, formData).pipe(
      map(res => res.respuesta === 'OK'),
      catchError(err => {
        console.error('Error uploading evidencia indicador', err);
        return throwError(() => err);
      })
    );
  }
}

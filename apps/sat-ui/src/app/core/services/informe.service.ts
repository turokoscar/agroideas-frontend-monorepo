import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, finalize, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ResponseDto } from '@agroideas/utils';

export interface Informe {
  ide_informe: number;
  ide_asistente: string;
  txt_asistente: string;
  ide_estadoInforme: string;
  txt_estadoInforme: string;
  fec_periodoInicio: string | null;
  fec_periodoFin: string | null;
  fec_generacion: string;
  txt_resumenGeneral: string;
  txt_conclusion: string;
  cantidad_actividades: number;
  cantidad_evidencias: number;
  /** @deprecated Typo del backend legacy. Eliminar cuando se corrija a `cantidad_evidencias`. */
  cantidad_evidecias?: number;
  fec_registro: string;
  txt_rutaPdf: string;
  flg_exportadoPdf: boolean;
}

export interface ActividadReporte {
  ide_actividad: string;
  txt_organizacion: string;
  txt_tipoActividad: string;
  fec_registro: string;
  txt_observaciones: string;
}

export interface HashDetalle {
  ide_evidencia: string;
  txt_hash: string;
  flg_integro: boolean;
}

export interface InformeDetalle {
  ide_informe: number;
  txt_asistente: string;
  fec_periodoInicio: string;
  fec_periodoFin: string;
  fec_generacion: string;
  txt_resumenGeneral: string;
  txt_conclusion: string;
  txt_resultados: string;
  txt_problemas: string;
  txt_propuestas: string;
  txt_recomendaciones: string;
  txt_metas: string;
  txt_rutaPdf: string;
  flg_exportadoPdf: boolean;
  actividades: ActividadReporte[];
  resumenHashes: {
    total_evidencias: number;
    evidencias_integras: number;
    evidencias_modificadas: number;
    hashes: HashDetalle[];
  };
}

export interface InformeSeccionesUpdate {
  ide_informe: number;
  txt_resumenGeneral: string;
  txt_resultados: string;
  txt_problemas: string;
  txt_propuestas: string;
  txt_recomendaciones: string;
  txt_metas: string;
  txt_conclusion: string;
}

export interface GenerarInformePayload {
  ide_asistente: string;
  fec_inicio: string | null;
  fec_fin: string | null;
}

@Injectable({ providedIn: 'root' })
export class InformeService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  private _loading = signal(false);
  loading = this._loading.asReadonly();

  listar(): Observable<Informe[]> {
    this._loading.set(true);
    return this.http.get<ResponseDto<Informe[]>>(`${this.apiUrl}/informes`).pipe(
      map(res => res.datos ?? []),
      finalize(() => this._loading.set(false))
    );
  }

  listarPorAsistente(ideAsistente: string): Observable<Informe[]> {
    this._loading.set(true);
    return this.http
      .get<ResponseDto<Informe[]>>(`${this.apiUrl}/informes/asistente/${ideAsistente}`)
      .pipe(
        map(res => res.datos ?? []),
        finalize(() => this._loading.set(false))
      );
  }

  generar(payload: GenerarInformePayload): Observable<ResponseDto<unknown>> {
    return this.http.post<ResponseDto<unknown>>(`${this.apiUrl}/informes/generar`, payload);
  }

  obtenerDetalle(ideInforme: number): Observable<InformeDetalle | null> {
    return this.http
      .get<ResponseDto<InformeDetalle>>(`${this.apiUrl}/informes/${ideInforme}/detalle`)
      .pipe(map(res => res.datos ?? null));
  }

  actualizarSecciones(payload: InformeSeccionesUpdate): Observable<ResponseDto<unknown>> {
    return this.http.put<ResponseDto<unknown>>(
      `${this.apiUrl}/informes/${payload.ide_informe}/secciones`,
      payload
    );
  }

  descargarPdf(ideInforme: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/informes/${ideInforme}/pdf`, { responseType: 'blob' });
  }

  subirPdfFirmado(ideInforme: number, archivo: File): Observable<ResponseDto<unknown>> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return this.http.post<ResponseDto<unknown>>(
      `${this.apiUrl}/informes/${ideInforme}/pdf-firmado`,
      formData
    );
  }
}

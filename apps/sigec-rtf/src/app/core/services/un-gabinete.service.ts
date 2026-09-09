import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { forkJoin, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  RtfCabeceraDto,
  UrCompletoDto,
  UrEvaluacionItemDto,
  UrEvaluacionRequestDto,
  DashboardUnData,
  ApiResponse,
  EvidenceDto,
  GastoF1Dto,
  IndicadorDto,
  MetaFisicaDto,
  InformeComprobacionDto
} from '../models';

/**
 * ADR-010: la UN maneja todo el ciclo de un expediente, desde que llega (EN_REVISION) hasta que
 * lo aprueba/rechaza (IN_REVISION_UN) — no hay un actor "UR" separado en el sistema. Este
 * servicio (antes solo IN_REVISION_UN) absorbe también lo que vivía en `UrAuditoriaService`
 * (bandeja EN_REVISION/AUDITADO_CAMPO, Acta de Campo, evaluación por fila, derivar, devolver
 * temprano) para que `UnGabineteComponent` sea la única pantalla de este flujo.
 */
@Injectable({
  providedIn: 'root'
})
export class UnGabineteService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // Bandeja: EN_REVISION + AUDITADO_CAMPO + IN_REVISION_UN, filtrada por cartera en el backend.
  unRtfList = signal<RtfCabeceraDto[]>([]);
  unSelectedRtfId = signal<number | null>(null);
  dashboardUnData = signal<DashboardUnData | null>(null);

  // RTF seleccionado (self-contained: no depende de las signals de OaRtfService, que solo se
  // llenan del lado OA y podían quedar vacías/desactualizadas para el RTF que la UN abre).
  cabeceraSeleccionada = signal<RtfCabeceraDto | null>(null);
  metas = signal<MetaFisicaDto[]>([]);
  indicadores = signal<IndicadorDto[]>([]);
  evidencias = signal<EvidenceDto[]>([]);
  gastosF1 = signal<GastoF1Dto[]>([]);

  rtfStatus = computed(() => this.cabeceraSeleccionada()?.estRtf ?? 'PENDIENTE');

  // Verificación de campo (Anexo 19, opcional) sobre el RTF seleccionado.
  urEvaluacionItems = signal<UrEvaluacionItemDto[]>([]);
  urActaCampoArchivo = signal<File | null>(null);

  // Anexo 18 - Informe de Comprobación (registrado por la UN, B-012).
  anexo18 = signal<InformeComprobacionDto | null>(null);

  loadDashboardUn() {
    return this.http.get<ApiResponse<DashboardUnData>>(`${this.apiUrl}/un/dashboard`).pipe(
      map(res => {
        this.dashboardUnData.set(res.datos || null);
        return res.datos;
      }),
      catchError(err => {
        console.error('Error loading UN dashboard', err);
        return throwError(() => err);
      })
    );
  }

  loadBandejaUn() {
    const estados = ['EN_REVISION', 'AUDITADO_CAMPO', 'IN_REVISION_UN'];
    return forkJoin(
      estados.map(estado =>
        this.http.get<ApiResponse<{ total: number; items: RtfCabeceraDto[] }>>(`${this.apiUrl}/rtfs?estado=${estado}`)
      )
    ).pipe(
      map(respuestas => {
        const items = respuestas.flatMap(res => res.datos?.items ?? []);
        this.unRtfList.set(items);
        return items;
      }),
      catchError(err => {
        console.error('Error loading UN bandeja', err);
        return throwError(() => err);
      })
    );
  }

  loadRtfCompleto(rtfId: number) {
    return this.http.get<ApiResponse<UrCompletoDto>>(`${this.apiUrl}/rtfs/${rtfId}/completo`).pipe(
      map(res => {
        const data = res.datos;
        if (data) {
          this.cabeceraSeleccionada.set(data.cabecera);
          this.metas.set(data.metas || []);
          this.indicadores.set(data.indicadores || []);
          this.evidencias.set(data.evidencias || []);
          this.gastosF1.set(data.gastos || []);
        }
        return data;
      }),
      catchError(err => {
        console.error('Error loading RTF completo', err);
        return throwError(() => err);
      })
    );
  }

  uploadActaCampo(rtfId: number, archivo: File) {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/rtfs/${rtfId}/actas-campo`, formData).pipe(
      map(res => {
        this.urActaCampoArchivo.set(archivo);
        return res;
      }),
      catchError(err => {
        console.error('Error uploading acta campo', err);
        return throwError(() => err);
      })
    );
  }

  guardarEvaluacionUr(rtfId: number, items: UrEvaluacionItemDto[]) {
    const body: UrEvaluacionRequestDto = { ideRtf: rtfId, items };
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/rtfs/${rtfId}/evaluaciones`, body).pipe(
      map(res => {
        this.urEvaluacionItems.set(items);
        return res;
      }),
      catchError(err => {
        console.error('Error saving evaluation', err);
        return throwError(() => err);
      })
    );
  }

  /** Continúa la evaluación (antes "derivar a UN" entre dos actores; ahora un paso interno). */
  derivarUn(rtfId: number) {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/rtfs/${rtfId}/derivaciones`, {}).pipe(
      catchError(err => {
        console.error('Error al continuar la evaluación del RTF', err);
        return throwError(() => err);
      })
    );
  }

  /** Devuelve a la OA antes de llegar a IN_REVISION_UN (desde EN_REVISION/AUDITADO_CAMPO). */
  devolverTemprano(rtfId: number, observacion: string) {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/rtfs/${rtfId}/devoluciones`, JSON.stringify(observacion), {
      headers: { 'Content-Type': 'application/json' }
    }).pipe(
      catchError(err => {
        console.error('Error devolviendo RTF', err);
        return throwError(() => err);
      })
    );
  }

  aprobarUn(rtfId: number, observacion?: string) {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/un/rtfs/${rtfId}/aprobaciones`, observacion ? JSON.stringify(observacion) : {}, {
      headers: { 'Content-Type': 'application/json' }
    }).pipe(
      map(res => {
        this.unSelectedRtfId.set(null);
        return res;
      }),
      catchError(err => {
        console.error('Error approving RTF from UN', err);
        return throwError(() => err);
      })
    );
  }

  rechazarUn(rtfId: number, observacion?: string) {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/un/rtfs/${rtfId}/rechazos`, observacion ? JSON.stringify(observacion) : {}, {
      headers: { 'Content-Type': 'application/json' }
    }).pipe(
      map(res => {
        this.unSelectedRtfId.set(null);
        return res;
      }),
      catchError(err => {
        console.error('Error rejecting RTF from UN', err);
        return throwError(() => err);
      })
    );
  }

  devolverUn(rtfId: number, observacion: string) {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/un/rtfs/${rtfId}/devoluciones-un`, JSON.stringify(observacion), {
      headers: { 'Content-Type': 'application/json' }
    }).pipe(
      map(res => {
        this.unSelectedRtfId.set(null);
        return res;
      }),
      catchError(err => {
        console.error('Error devolviendo RTF desde UN', err);
        return throwError(() => err);
      })
    );
  }

  /** Anexo 18 - Informe de Comprobación: es UN quien lo registra (CLAUDE.md, ADR-010). */
  cargarAnexo18(rtfId: number) {
    return this.http.get<ApiResponse<InformeComprobacionDto | null>>(`${this.apiUrl}/un/rtfs/${rtfId}/informe-comprobacion`).pipe(
      map(res => {
        this.anexo18.set(res.datos ?? null);
        return res.datos ?? null;
      }),
      catchError(err => {
        console.error('Error cargando el Anexo 18', err);
        return throwError(() => err);
      })
    );
  }

  guardarAnexo18(rtfId: number, informe: Partial<InformeComprobacionDto>) {
    const body: Partial<InformeComprobacionDto> = { ...informe, ideRtf: rtfId };
    return this.http.post<ApiResponse<InformeComprobacionDto>>(`${this.apiUrl}/un/rtfs/${rtfId}/informe-comprobacion`, body).pipe(
      map(res => {
        this.anexo18.set(res.datos ?? null);
        return res.datos ?? null;
      }),
      catchError(err => {
        console.error('Error guardando el Anexo 18', err);
        return throwError(() => err);
      })
    );
  }
}

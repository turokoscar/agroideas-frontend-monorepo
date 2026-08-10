import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { of, throwError } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import {
  PasoCritico,
  Disbursement,
  MetaFisicaDto,
  IndicadorDto,
  RtfCabeceraDto,
  EvidenceDto,
  GastoF1Dto,
  ActividadReciente,
  DashboardData,
  ApiResponse,
  DatosPaginados
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class OaRtfService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // State signals
  loading = signal(false);
  postulanteId = signal<number | null>(null);
  rtfId = signal<number | null>(null);
  rtfStatus = signal<string>('PENDIENTE');
  rtfDeadlineHours = signal(0);
  convenioId = signal('');
  oa = signal('');
  budget = signal(0);
  disbursed = signal(0);
  durationMonths = signal(0);
  currentMonth = signal(0);
  activePasoNumero = signal(0);
  totalPasos = signal(0);
  physicalProgress = signal(0);

  pasos = signal<PasoCritico[]>([]);
  disbursements = signal<Disbursement[]>([]);

  // R1 data
  txtActividadesRealizadas = signal<string>('');
  txtActividadesNoRealizadas = signal<string>('');
  txtLogros = signal<string>('');
  txtDificultades = signal<string>('');
  txtCambiosPaso = signal<string>('');

  metas = signal<MetaFisicaDto[]>([]);
  indicadores = signal<IndicadorDto[]>([]);
  evidencias = signal<EvidenceDto[]>([]);
  gastosF1 = signal<GastoF1Dto[]>([]);
  observacionesUR = signal('');
  actividadReciente = signal<ActividadReciente[]>([]);


  // OA Bandeja state
  oaBandejaList = signal<RtfCabeceraDto[]>([]);
  oaBandejaTotal = signal(0);
  oaBandejaEstado = signal<string>('PENDIENTE');
  oaBandejaPagina = signal(1);

  resolvePostulanteId() {
    return this.http.get<ApiResponse<{ postulanteId: number }>>(`${this.apiUrl}/rtfs/postulante/mi-id`).pipe(
      map(res => res.datos?.postulanteId),
      tap(postulanteId => {
        if (postulanteId) this.postulanteId.set(postulanteId);
      }),
      catchError(err => {
        console.error('Error resolving postulanteId', err);
        return throwError(() => err);
      })
    );
  }

  cargarPasosCriticosDelUsuario() {
    const id = this.postulanteId();
    const postulante$ = id ? of(id) : this.resolvePostulanteId();
    return postulante$.pipe(
      switchMap(postulanteId => {
        if (!postulanteId) return of([]);
        return this.loadPasosCriticos(postulanteId);
      }),
      map(() => this.pasos())
    );
  }

  loadDashboard(postulanteId: number) {
    return this.http.get<ApiResponse<DashboardData>>(`${this.apiUrl}/rtfs/postulante/${postulanteId}/dashboard`).pipe(
      map(res => {
        const data = res.datos;
        if (data) {
          this.convenioId.set(data.convenioId);
          this.oa.set(data.oa);
          this.budget.set(data.budget);
          this.disbursed.set(data.disbursed);
          this.durationMonths.set(data.durationMonths);
          this.currentMonth.set(data.currentMonth);
          this.rtfStatus.set(data.activeRtfStatus);
          this.activePasoNumero.set(data.activePasoNumero);
          this.totalPasos.set(data.totalPasos);
          this.physicalProgress.set(data.physicalProgress);
          if (data.pasos) {
            this.pasos.set(data.pasos.map((p: any) => ({
              id: p.id,
              label: p.label,
              startMonth: p.startMonth,
              endMonth: p.endMonth,
              start: new Date(p.start),
              end: new Date(p.end),
              status: p.status,
              rtfId: p.rtfId
            })));
          }
          if (data.disbursements) {
            this.disbursements.set(data.disbursements);
          }
        }
        return data;
      }),
      catchError(err => {
        console.error('Error loading dashboard', err);
        return throwError(() => err);
      })
    );
  }

  loadPasosCriticos(postulanteId: number) {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/rtfs/postulante/${postulanteId}/pasos-criticos`).pipe(
      map(res => {
        const data = res.datos;
        if (Array.isArray(data)) {
          this.pasos.set(data.map((p: any) => ({
            id: p.id,
            label: p.label,
            startMonth: p.startMonth,
            endMonth: p.endMonth,
            start: new Date(p.start),
            end: new Date(p.end),
            status: p.status,
            rtfId: p.rtfId
          })));
        }
        return data;
      })
    );
  }

  loadDetalleRtf(rtfId: number) {
    return this.http.get<ApiResponse<RtfCabeceraDto>>(`${this.apiUrl}/rtfs/${rtfId}`).pipe(
      map(res => {
        const data = res.datos;
        if (data) {
          this.rtfId.set(data.ideRtf!);
          this.rtfStatus.set(data.estRtf || 'PENDIENTE');
          this.txtActividadesRealizadas.set(data.txtActividadesRealizadas || '');
          this.txtActividadesNoRealizadas.set(data.txtActividadesNoRealizadas || '');
          this.txtLogros.set(data.txtLogros || '');
          this.txtDificultades.set(data.txtDificultades || '');
          this.txtCambiosPaso.set(data.txtCambiosPaso || '');
        }
        return data;
      }),
      catchError(err => {
        console.error('Error loading rtf detail', err);
        return throwError(() => err);
      })
    );
  }

  loadMetas(rtfId: number) {
    return this.http.get<ApiResponse<MetaFisicaDto[]>>(`${this.apiUrl}/rtfs/${rtfId}/metas-fisicas`).pipe(
      map(res => {
        this.metas.set(res.datos || []);
        return res.datos;
      }),
      catchError(err => {
        console.error('Error loading metas', err);
        return throwError(() => err);
      })
    );
  }

  loadIndicadores(rtfId: number) {
    return this.http.get<ApiResponse<IndicadorDto[]>>(`${this.apiUrl}/rtfs/${rtfId}/indicadores`).pipe(
      map(res => {
        this.indicadores.set(res.datos || []);
        return res.datos;
      }),
      catchError(err => {
        console.error('Error loading indicadores', err);
        return throwError(() => err);
      })
    );
  }

  loadEvidencias(rtfId: number) {
    return this.http.get<ApiResponse<EvidenceDto[]>>(`${this.apiUrl}/rtfs/${rtfId}/evidencias`).pipe(
      map(res => {
        this.evidencias.set(res.datos || []);
        return res.datos;
      }),
      catchError(err => {
        console.error('Error loading evidencias', err);
        return throwError(() => err);
      })
    );
  }

  loadGastosF1(rtfId: number) {
    return this.http.get<ApiResponse<GastoF1Dto[]>>(`${this.apiUrl}/rtfs/${rtfId}/gastos-f1`).pipe(
      map(res => {
        this.gastosF1.set(res.datos || []);
        return res.datos;
      }),
      catchError(err => {
        console.error('Error loading gastos F1', err);
        return throwError(() => err);
      })
    );
  }

  loadEstadoPlazo(rtfId: number) {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/rtfs/${rtfId}/estado-plazo`).pipe(
      map(res => {
        const data = res.datos;
        if (data?.horasRestantes) {
          this.rtfDeadlineHours.set(data.horasRestantes);
        }
        return data;
      }),
      catchError(err => {
        console.error('Error loading plazo', err);
        return throwError(() => err);
      })
    );
  }

  registrarRtf(data: Partial<RtfCabeceraDto>) {
    return this.http.post<ApiResponse<RtfCabeceraDto>>(`${this.apiUrl}/rtfs`, data).pipe(
      map(res => {
        if (res.datos?.ideRtf) {
          this.rtfId.set(res.datos.ideRtf);
        }
        return res.datos;
      }),
      catchError(err => {
        console.error('Error registering rtf', err);
        return throwError(() => err);
      })
    );
  }

  updateRtf(rtfId: number, data: Partial<RtfCabeceraDto>) {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/rtfs/${rtfId}`, data).pipe(
      map(res => {
        if (data.txtActividadesRealizadas !== undefined) this.txtActividadesRealizadas.set(data.txtActividadesRealizadas);
        if (data.txtActividadesNoRealizadas !== undefined) this.txtActividadesNoRealizadas.set(data.txtActividadesNoRealizadas);
        if (data.txtLogros !== undefined) this.txtLogros.set(data.txtLogros);
        if (data.txtDificultades !== undefined) this.txtDificultades.set(data.txtDificultades);
        if (data.txtCambiosPaso !== undefined) this.txtCambiosPaso.set(data.txtCambiosPaso);
        return res;
      }),
      catchError(err => {
        console.error('Error updating rtf cabecera', err);
        return throwError(() => err);
      })
    );
  }

  updateMetas(rtfId: number, metas: MetaFisicaDto[]) {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/rtfs/${rtfId}/metas-fisicas`, metas).pipe(
      catchError(err => {
        console.error('Error updating metas', err);
        return throwError(() => err);
      })
    );
  }

  updateIndicadores(rtfId: number, indicadores: IndicadorDto[]) {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/rtfs/${rtfId}/indicadores`, indicadores).pipe(
      catchError(err => {
        console.error('Error updating indicadores', err);
        return throwError(() => err);
      })
    );
  }

  enviarRtf(rtfId: number) {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/rtfs/${rtfId}/enviar`, {}).pipe(
      map(res => {
        this.rtfStatus.set('ENVIADO');
        return res;
      }),
      catchError(err => {
        console.error('Error sending rtf', err);
        return throwError(() => err);
      })
    );
  }

  uploadEvidencia(rtfId: number, ideConcepto: number, tipConcepto: string, archivo: File) {
    const formData = new FormData();
    formData.append('ideConcepto', ideConcepto.toString());
    formData.append('tipConcepto', tipConcepto);
    formData.append('archivo', archivo);
    return this.http.post<ApiResponse<EvidenceDto>>(`${this.apiUrl}/rtfs/${rtfId}/evidencias`, formData).pipe(
      map(res => {
        if (res.datos) {
          this.evidencias.update(ev => [...ev, res.datos!]);
        }
        return res.datos;
      }),
      catchError(err => {
        console.error('Error uploading evidencia', err);
        return throwError(() => err);
      })
    );
  }

  downloadEvidencia(evidenciaId: number) {
    return this.http.get(`${this.apiUrl}/rtfs/evidencias/${evidenciaId}/descarga`, {
      responseType: 'blob'
    }).pipe(
      catchError(err => {
        console.error('Error downloading evidencia', err);
        return throwError(() => err);
      })
    );
  }

  removeEvidencia(evidenciaId: number) {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/rtfs/evidencias/${evidenciaId}`).pipe(
      map(res => {
        this.evidencias.update(ev => ev.filter(e => e.ideEvidencia !== evidenciaId));
        return res;
      }),
      catchError(err => {
        console.error('Error removing evidencia', err);
        return throwError(() => err);
      })
    );
  }

  loadActividadReciente() {
    return this.http.get<ApiResponse<ActividadReciente[]>>(`${this.apiUrl}/rtfs/actividad-reciente`).pipe(
      map(res => {
        if (Array.isArray(res.datos)) {
          this.actividadReciente.set(res.datos);
        }
        return res.datos;
      }),
      catchError(err => {
        console.error('Error loading actividad reciente', err);
        return throwError(() => err);
      })
    );
  }

  loadDisbursements(rtfId: number) {
    return this.http.get<ApiResponse<Disbursement[]>>(`${this.apiUrl}/rtfs/${rtfId}/desembolsos`).pipe(
      map(res => {
        if (Array.isArray(res.datos)) {
          this.disbursements.set(res.datos);
        }
        return res.datos;
      }),
      catchError(err => {
        console.error('Error loading disbursements', err);
        return throwError(() => err);
      })
    );
  }

  updateMeta(index: number, patch: Partial<MetaFisicaDto>) {
    this.metas.update(prev => prev.map((m, i) => i === index ? { ...m, ...patch } : m));
  }

  updateIndicador(index: number, patch: Partial<IndicadorDto>) {
    this.indicadores.update(prev => prev.map((ind, i) => i === index ? { ...ind, ...patch } : ind));
  }

  loadBandejaOA(estado: string, pagina: number = 1, cantidad: number = 10) {
    return this.http.get<ApiResponse<DatosPaginados<RtfCabeceraDto>>>(`${this.apiUrl}/rtfs?estado=${estado}&pagina=${pagina}&cantidad=${cantidad}`).pipe(
      map(res => {
        this.oaBandejaList.set(res.datos?.items || []);
        this.oaBandejaTotal.set(res.datos?.total || 0);
        this.oaBandejaEstado.set(estado);
        this.oaBandejaPagina.set(pagina);
        return res.datos;
      }),
      catchError(err => {
        console.error('Error loading OA bandeja', err);
        return throwError(() => err);
      })
    );
  }
}

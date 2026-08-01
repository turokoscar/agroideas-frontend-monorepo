import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { of, throwError } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';

export interface PasoCritico {
  id: number;
  label: string;
  startMonth: number;
  endMonth: number;
  start: Date;
  end: Date;
  status: 'Aprobado' | 'Activo' | 'Pendiente' | 'Validado' | 'Vencido' | 'Rechazado';
  rtfId?: number;
}

export interface Disbursement {
  id: string;
  item: string;
  activityId: string;
  amount: number;
  date: string;
  status: 'Ejecutado' | 'Pendiente';
}

export interface MetaFisicaDto {
  ideMetaFisica?: number;
  ideRtf?: number;
  ideActividad: number;
  actividad?: string;
  unidad?: string;
  lineaBase?: number;
  canProgramada: number;
  canEjecutada: number | null;
  txtComentario?: string;
}

export interface IndicadorDto {
  ideIndicadorAvance?: number;
  ideRtf?: number;
  ideIndicador: number;
  nombre?: string;
  unidad?: string;
  lineaBase?: number;
  canProgramado: number;
  canEjecutado: number | null;
  txtComentario?: string;
}

export interface RtfCabeceraDto {
  ideRtf?: number;
  ideConvenio: number;
  numPasoCritico: number;
  fecInicioPeriodo: string;
  fecFinPeriodo: string;
  estRtf?: string;
  fecHabilitacion: string;
  fecLimite: string;
  fecRegistro?: string;
  fecEnvio?: string;
  txtActividadesRealizadas?: string;
  txtActividadesNoRealizadas?: string;
  txtLogros?: string;
  txtDificultades?: string;
  txtCambiosPaso?: string;
}

export interface EvidenceDto {
  ideEvidencia: number;
  ideRtf: number;
  ideConcepto: number;
  tipConcepto: 'METAFISICA' | 'INDICADOR';
  ideArchivo: string;
  txtNombreArchivo?: string;
  fecRegistro?: string;
}

export interface GastoF1Dto {
  ideGastoF1: number;
  ideRtf: number;
  txtItemNombre?: string;
  txtUnidadMedida?: string;
  canCantidad: number;
  numPrecioAdjudicado: number;
  numMontoRendido: number;
  fecEmision?: string;
  txtSerieNumero?: string;
  txtTipoCpe?: string;
  txtProveedorNombre?: string;
  txtProveedorRuc?: string;
}

export interface DashboardData {
  convenioId: string;
  oa: string;
  budget: number;
  disbursed: number;
  durationMonths: number;
  currentMonth: number;
  activeRtfStatus: string;
  activePasoNumero: number;
  totalPasos: number;
  physicalProgress: number;
  pasos: any[];
  disbursements: any[];
}

export interface ApiResponse<T> {
  respuesta: 'OK' | 'ERROR';
  mensaje: string;
  datos: T;
}

export interface DatosPaginados<T> {
  total: number;
  items: T[];
}

export interface ActividadReciente {
  id: number;
  tipo: 'aprobado' | 'desembolso' | 'edicion' | 'observacion' | 'envio' | 'vencido' | 'alerta';
  mensaje: string;
  tiempo: string;
  icono: string;
}

export interface UrCompletoDto {
  cabecera: RtfCabeceraDto;
  metas: MetaFisicaDto[];
  indicadores: IndicadorDto[];
  evidencias: EvidenceDto[];
  gastos: GastoF1Dto[];
  revisiones: any[];
  verificacionesCampo: any[];
}

export interface UrEvaluacionItemDto {
  id: number;
  kind: 'META' | 'INDICADOR';
  estConformidad: 'CONFORME' | 'OBSERVADO';
  txtObservacion?: string;
}

export interface UrEvaluacionRequestDto {
  ideRtf: number;
  items: UrEvaluacionItemDto[];
}

// ADR-003 — Indicadores desde BD_SEL vía sel-api-general
export interface PasoCriticoIndicador {
  id: number;
  pasoCriticoID: number;
  postulanteIndicadorCadenaID: number;
  cadenaProductiva?: string;
  indicador?: string;
  unidadMedida?: string;
  lineaBase?: number;
  meta?: number;
  lineaCierre?: number;
  metaProgramada: number;
  metaEjecutada: number;
  evidencia?: string;
  comentarios?: string;
}

// ADR-002 — Metas físicas/financieras desde BD_SEL vía sel-api-general
export interface PasoCriticoMeta {
  id: number;
  marcoLogicoID: number;
  pasoCriticoID: number;
  metaFisicaProgramada: number;
  metaFisicaEjecutada: number;
  metaFinancieraProgramada: number;
  metaFinancieraEjecutada: number;
  comentarios?: string;
  evidencia?: string;
  descripcion?: string;
  tipo?: string;
  unidadMedida?: string;
  orden?: number;
}

// Fase 5 - Dashboard UN
export interface DashboardUnData {
  totalRtfs: number;
  aprobados: number;
  rechazados: number;
  pendientes: number;
  enEdicion: number;
  enRevision: number;
  inRevisionUn: number;
  vencidos: number;
  avanceFisicoPromedio: number;
  convenios: DashboardUnConvenioItemDto[];
}

export interface DashboardUnConvenioItemDto {
  ideConvenio: number;
  totalRtfs: number;
  aprobados: number;
  pendientes: number;
  vencidos: number;
  avanceFisicoPromedio: number;
}

@Injectable({
  providedIn: 'root'
})
export class RtfService {
  private http = inject(HttpClient);

  // State signals
  loading = signal(false);
  postulanteId = signal<number | null>(null);
  rtfId = signal<number | null>(null);
  rtfStatus = signal<string>('PENDIENTE');
  rtfStatusLabel = computed(() => {
    const map: Record<string, string> = {
      'PENDIENTE': 'En Edición',
      'EN_EDICION': 'En Edición',
      'EN_REVISION': 'En Revisión',
      'AUDITADO_CAMPO': 'Auditado en Campo',
      'IN_REVISION_UN': 'En Evaluación de Gabinete',
      'APROBADO': 'Aprobado',
      'RECHAZADO': 'Rechazado',
      'VENCIDO': 'Vencido',
    };
    return map[this.rtfStatus()] ?? this.rtfStatus();
  });
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

  // UR - Auditoría Regional state
  urRtfList = signal<RtfCabeceraDto[]>([]);
  urSelectedRtfId = signal<number | null>(null);
  urEvaluacionItems = signal<UrEvaluacionItemDto[]>([]);
  urActaCampoArchivo = signal<File | null>(null);

  // UN - Gabinete / Evaluación Nacional state
  unRtfList = signal<RtfCabeceraDto[]>([]);
  unSelectedRtfId = signal<number | null>(null);
  unEvaluacionItems = signal<UrEvaluacionItemDto[]>([]);
  unObservacionDevolver = signal<string>('');

  // Fase 5 - OA Bandeja state
  oaBandejaList = signal<RtfCabeceraDto[]>([]);
  oaBandejaTotal = signal(0);
  oaBandejaEstado = signal<string>('PENDIENTE');
  oaBandejaPagina = signal(1);

  // ADR-002 — Metas BD_SEL state
  pasoCriticoMetas = signal<PasoCriticoMeta[]>([]);
  pasoCriticoId = signal<number | null>(null);

  // ADR-003 — Indicadores BD_SEL state
  pasoCriticoIndicadores = signal<PasoCriticoIndicador[]>([]);

  // Fase 5 - UN Dashboard state
  dashboardUnData = signal<DashboardUnData | null>(null);

  private apiUrl = environment.apiUrl;

  /** El postulante se resuelve del usuario del token, no hace falta pasarlo. */
  resolvePostulanteId() {
    return this.http.get<ApiResponse<{ postulanteId: number }>>(`${this.apiUrl}/rtfs/postulante/mi-id`).pipe(
      map(res => res.datos.postulanteId),
      tap(postulanteId => this.postulanteId.set(postulanteId)),
      catchError(err => {
        console.error('Error resolving postulanteId', err);
        return throwError(() => err);
      })
    );
  }

  /**
   * Carga los pasos críticos del postulante autenticado. La usa el menú lateral,
   * que necesita la lista en cualquier ruta y no solo en el dashboard.
   */
  cargarPasosCriticosDelUsuario() {
    const id = this.postulanteId();
    const postulante$ = id ? of(id) : this.resolvePostulanteId();
    return postulante$.pipe(
      switchMap(postulanteId => this.loadPasosCriticos(postulanteId)),
      map(() => this.pasos())
    );
  }

  loadDashboard(postulanteId: number) {
    return this.http.get<ApiResponse<DashboardData>>(`${this.apiUrl}/rtfs/postulante/${postulanteId}/dashboard`).pipe(
      map(res => {
        const data = res.datos;
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
        this.rtfId.set(data.ideRtf!);
        this.rtfStatus.set(data.estRtf || 'PENDIENTE');
        this.txtActividadesRealizadas.set(data.txtActividadesRealizadas || '');
        this.txtActividadesNoRealizadas.set(data.txtActividadesNoRealizadas || '');
        this.txtLogros.set(data.txtLogros || '');
        this.txtDificultades.set(data.txtDificultades || '');
        this.txtCambiosPaso.set(data.txtCambiosPaso || '');
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

  // UR - Auditoría Regional
  loadBandejaUr() {
    return this.http.get<ApiResponse<RtfCabeceraDto[]>>(`${this.apiUrl}/rtfs?estado=EN_REVISION`).pipe(
      map(res => {
        this.urRtfList.set(res.datos || []);
        return res.datos;
      }),
      catchError(err => {
        console.error('Error loading UR bandeja', err);
        return throwError(() => err);
      })
    );
  }

  loadRtfCompleto(rtfId: number) {
    return this.http.get<ApiResponse<UrCompletoDto>>(`${this.apiUrl}/rtfs/completo/${rtfId}`).pipe(
      map(res => {
        const data = res.datos;
        if (data) {
          this.rtfId.set(data.cabecera.ideRtf!);
          this.rtfStatus.set(data.cabecera.estRtf || 'PENDIENTE');
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
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/rtfs/${rtfId}/acta-campo`, formData).pipe(
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
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/rtfs/${rtfId}/evaluacion-ur`, body).pipe(
      map(res => {
        this.urEvaluacionItems.set(items);
        return res;
      }),
      catchError(err => {
        console.error('Error saving UR evaluation', err);
        return throwError(() => err);
      })
    );
  }

  derivarUn(rtfId: number) {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/rtfs/${rtfId}/derivar-un`, {}).pipe(
      map(res => {
        this.rtfStatus.set('IN_REVISION_UN');
        return res;
      }),
      catchError(err => {
        console.error('Error deriving RTF to UN', err);
        return throwError(() => err);
      })
    );
  }

  devolverRtf(rtfId: number, observacion: string) {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/rtfs/${rtfId}/devolver`, JSON.stringify(observacion), {
      headers: { 'Content-Type': 'application/json' }
    }).pipe(
      map(res => {
        this.rtfStatus.set('EN_EDICION');
        return res;
      }),
      catchError(err => {
        console.error('Error devolviendo RTF', err);
        return throwError(() => err);
      })
    );
  }

  // Fase 5 - OA Bandeja
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

  // Fase 5 - Dashboard UN
  loadDashboardUn() {
    return this.http.get<ApiResponse<DashboardUnData>>(`${this.apiUrl}/rtfs/dashboard-un`).pipe(
      map(res => {
        this.dashboardUnData.set(res.datos);
        return res.datos;
      }),
      catchError(err => {
        console.error('Error loading UN dashboard', err);
        return throwError(() => err);
      })
    );
  }

  // UN - Gabinete / Evaluación Nacional
  loadBandejaUn() {
    return this.http.get<ApiResponse<{ total: number; items: RtfCabeceraDto[] }>>(`${this.apiUrl}/rtfs/bandeja/un`).pipe(
      map(res => {
        this.unRtfList.set(res.datos?.items || []);
        return res.datos;
      }),
      catchError(err => {
        console.error('Error loading UN bandeja', err);
        return throwError(() => err);
      })
    );
  }

  aprobarUn(rtfId: number, observacion?: string) {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/rtfs/${rtfId}/aprobar-un`, observacion ? JSON.stringify(observacion) : {}, {
      headers: { 'Content-Type': 'application/json' }
    }).pipe(
      map(res => {
        this.rtfStatus.set('APROBADO');
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
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/rtfs/${rtfId}/rechazar-un`, observacion ? JSON.stringify(observacion) : {}, {
      headers: { 'Content-Type': 'application/json' }
    }).pipe(
      map(res => {
        this.rtfStatus.set('RECHAZADO');
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
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/rtfs/${rtfId}/devolver-un`, JSON.stringify(observacion), {
      headers: { 'Content-Type': 'application/json' }
    }).pipe(
      map(res => {
        this.rtfStatus.set('EN_EDICION');
        this.unSelectedRtfId.set(null);
        return res;
      }),
      catchError(err => {
        console.error('Error devolviendo RTF desde UN', err);
        return throwError(() => err);
      })
    );
  }

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

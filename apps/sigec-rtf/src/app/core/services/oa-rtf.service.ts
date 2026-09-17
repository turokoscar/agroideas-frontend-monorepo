import { Injectable, inject, signal, computed } from '@angular/core';
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
  DatosPaginados,
  ControlPlazoDto,
  RevisionAtencionItem,
  RelacionGastosF1Dto
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
  // ADR-012 de sigec-api-rtf/docs: sin filtro, el backend devuelve el plazo activo más reciente
  // -- será SUBSANACION_OBSERVACION en vez de PRESENTACION_INICIAL en cuanto la UN devuelva el
  // RTF con observaciones. Se guarda el tipo para que la plantilla rotule el banner correctamente
  // ("Plazo para envío" vs "Plazo para subsanar observaciones").
  rtfDeadlineTipo = signal<string | null>(null);
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
  ultimaSincronizacionGastosF1 = computed(() => {
    const fechas = this.gastosF1().map(g => g.fecRegistro).filter((f): f is string => !!f);
    return fechas.length ? fechas.reduce((max, f) => (f > max ? f : max)) : null;
  });
  /** Formato "4. Relación de Gastos Realizados - F1" (ADR-017), gastosF1() agrupado por ítem
   * con el desglose Monto Aprobado OA/AGROIDEAS real. */
  relacionGastosF1 = signal<RelacionGastosF1Dto | null>(null);
  actividadReciente = signal<ActividadReciente[]>([]);


  // OA Bandeja state
  oaBandejaList = signal<RtfCabeceraDto[]>([]);
  oaBandejaTotal = signal(0);
  oaBandejaEstado = signal<string>('PENDIENTE');

  resolvePostulanteId() {
    return this.http.get<ApiResponse<{ postulanteId: number }>>(`${this.apiUrl}/postulantes/actual`).pipe(
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
    return this.http.get<ApiResponse<DashboardData>>(`${this.apiUrl}/postulantes/${postulanteId}/dashboard`).pipe(
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
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/postulantes/${postulanteId}/pasos-criticos`).pipe(
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

  /** Snapshot local compartido con la UN (ADR-012) — ya no es una llamada en vivo a KOFIX. */
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

  /** Botón "Sincronizar" — refresca el snapshot de gastos F1 desde KOFIX (ADR-012). */
  sincronizarGastosF1(rtfId: number) {
    return this.http.post<ApiResponse<GastoF1Dto[]>>(`${this.apiUrl}/rtfs/${rtfId}/gastos-f1/sincronizacion`, {}).pipe(
      map(res => {
        this.gastosF1.set(res.datos || []);
        return res.datos;
      }),
      catchError(err => {
        console.error('Error sincronizando gastos F1', err);
        return throwError(() => err);
      })
    );
  }

  /** ADR-017: vista agrupada por ítem del snapshot de gastos F1, con el desglose real Monto
   * Aprobado OA/AGROIDEAS por ítem. Se recarga junto con gastosF1() (misma fuente). */
  loadRelacionGastosF1(rtfId: number) {
    return this.http.get<ApiResponse<RelacionGastosF1Dto>>(`${this.apiUrl}/rtfs/${rtfId}/gastos-f1/relacion`).pipe(
      map(res => {
        this.relacionGastosF1.set(res.datos || null);
        return res.datos;
      }),
      catchError(err => {
        console.error('Error loading relación de gastos F1', err);
        return throwError(() => err);
      })
    );
  }

  loadEstadoPlazo(rtfId: number) {
    return this.http.get<ApiResponse<ControlPlazoDto | null>>(`${this.apiUrl}/rtfs/${rtfId}/estado-plazo`).pipe(
      map(res => {
        const data = res.datos;
        // Antes se comparaba con `if (data?.horasRestantes)`: un plazo ya vencido llega con
        // horasRestantes = 0, un valor "falsy" que dejaba el banner con el valor previo en vez de
        // reflejar el vencimiento real.
        this.rtfDeadlineHours.set(data ? data.horasRestantes : 0);
        this.rtfDeadlineTipo.set(data?.tipPlazo ?? null);
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

  enviarRtf(rtfId: number) {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/rtfs/${rtfId}/envios`, {}).pipe(
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

  uploadEvidencia(rtfId: number, ideConcepto: number, tipConcepto: string, archivo: File, etiqueta?: string) {
    const formData = new FormData();
    formData.append('ideConcepto', ideConcepto.toString());
    formData.append('tipConcepto', tipConcepto);
    formData.append('archivo', archivo);
    if (etiqueta) {
      formData.append('etiqueta', etiqueta);
    }
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
    return this.http.get(`${this.apiUrl}/evidencias/${evidenciaId}/contenido`, {
      responseType: 'blob'
    }).pipe(
      catchError(err => {
        console.error('Error downloading evidencia', err);
        return throwError(() => err);
      })
    );
  }

  /**
   * ADR-014 Parte 2: antes del envío devuelve una vista previa reconstruida al vuelo con los
   * datos actuales (aún no hay `TxtStoragePdf`); tras el envío sirve el PDF congelado con el que
   * se envió el RTF. `DocumentoController.DescargarAnexo17` distingue ambos casos con el header
   * `X-Documento-Origen`, que no hace falta leer aquí.
   */
  descargarAnexo17(rtfId: number) {
    return this.http.get(`${this.apiUrl}/rtfs/${rtfId}/documentos/anexo17`, {
      responseType: 'blob'
    }).pipe(
      catchError(err => {
        console.error('Error downloading Anexo 17', err);
        return throwError(() => err);
      })
    );
  }

  /**
   * ADR-014 (frontend) Fase 7: mismo endpoint que ya usa `un-gabinete.service.ts` vía
   * `cargarAnexo18` para traer el formulario, pero aquí solo se necesita el PDF ya emitido —
   * `DocumentoController.DescargarAnexo18`, sin restricción de rol. Si el Anexo 18 todavía no
   * se generó (`informe == null` en `PdfService.GenerarAnexo18PdfAsync`), el backend devuelve
   * un PDF vacío en vez de 404; el visor ya maneja ese caso como error de carga.
   */
  descargarAnexo18(rtfId: number) {
    return this.http.get(`${this.apiUrl}/rtfs/${rtfId}/documentos/anexo18`, {
      responseType: 'blob'
    }).pipe(
      catchError(err => {
        console.error('Error downloading Anexo 18', err);
        return throwError(() => err);
      })
    );
  }

  /**
   * Documento de sustento (factura/RH, voucher) que KOFIX adjuntó a un gasto F1 al sincronizar
   * -- no todos los gastos lo traen (`GastoF1Dto.ideArchivo` es opcional), el backend responde
   * 400 explícito si no hay ninguno.
   */
  descargarGastoF1(rtfId: number, ideGastoF1: number) {
    return this.http.get(`${this.apiUrl}/rtfs/${rtfId}/gastos-f1/${ideGastoF1}/contenido`, {
      responseType: 'blob'
    }).pipe(
      catchError(err => {
        console.error('Error downloading Gasto F1', err);
        return throwError(() => err);
      })
    );
  }

  /**
   * ADR-016 Fase 3 (sigec-api-rtf): la OA marca como atendida cada observación de la UN antes
   * de reenviar. Vive en `RtfController`/`oa-rtf.service.ts` (no en
   * `UnidadRegionalController`/`un-gabinete.service.ts`) porque es una acción de la OA sobre su
   * propio expediente, no una evaluación de la UN — mismo criterio de ubicación que el resto de
   * este servicio.
   */
  atenderObservaciones(rtfId: number, respuestas: RevisionAtencionItem[]) {
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/rtfs/${rtfId}/evaluaciones/atencion`, { respuestas }).pipe(
      map(res => res.datos),
      catchError(err => {
        console.error('Error al atender observaciones', err);
        return throwError(() => err);
      })
    );
  }

  removeEvidencia(evidenciaId: number) {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/evidencias/${evidenciaId}`).pipe(
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

  /**
   * ADR-014 (frontend) Fase 7: `estados` (CSV) reemplaza el `estado` singular para poder
   * consolidar varios estados backend en un solo tab de la bandeja (p. ej. "En Revisión en
   * AGROIDEAS" = EN_REVISION+AUDITADO_CAMPO+IN_REVISION_UN) en una sola llamada — mismo
   * mecanismo que `UnGabineteService.loadBandejaUn` ya usa en producción (ver ADR-013).
   * `cantidad=200` (antes 10) trae toda la cartera del postulante en una sola página; con eso,
   * `UiDataTableComponent` pagina y `filtroTexto` filtra 100% en cliente, sin más round-trips.
   *
   * OJO — riesgo conocido, no introducido por este cambio: `RtfController.Listar` marca
   * `esBandejaEspecialistaUn = true` en cuanto TODOS los estados pedidos están en
   * `EstadoRtf.EstadosBandejaUn` (incluye EN_REVISION/AUDITADO_CAMPO/IN_REVISION_UN) — sin
   * distinguir si quien llama es un especialista UN o una OA. Para una OA eso dispara
   * `soloConveniosAsignados=true` y el backend intenta resolver "convenios asignados" (cartera)
   * contra `sel-api-general` para un usuario que no tiene ese concepto — ya le pasaba al tab
   * "En Revisión" de esta bandeja ANTES de este cambio (un solo `estado=EN_REVISION` ya activa
   * la misma condición). Resultado esperado hoy: ese tab vuelve vacío (o error si
   * `ObtenerConveniosAsignadosAsync` lanza) hasta que se corrija `RtfController.Listar` para
   * distinguir el rol del caller, no solo la forma de `estados`. Ver ADR-014 (frontend).
   */
  loadBandejaOA(estados: string[], cantidad = 200) {
    return this.http.get<ApiResponse<DatosPaginados<RtfCabeceraDto>>>(`${this.apiUrl}/rtfs?estados=${estados.join(',')}&cantidad=${cantidad}`).pipe(
      map(res => {
        const items = res.datos?.items ?? [];
        this.oaBandejaList.set(items);
        this.oaBandejaTotal.set(res.datos?.total ?? items.length);
        this.oaBandejaEstado.set(estados.join(','));
        return items;
      }),
      catchError(err => {
        console.error('Error loading OA bandeja', err);
        return throwError(() => err);
      })
    );
  }
}

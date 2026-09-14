import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { PasoCriticoService } from './paso-critico.service';
import {
  RtfCabeceraDto,
  UrCompletoDto,
  UrEvaluacionItemDto,
  UrEvaluacionRequestDto,
  DashboardUnData,
  ApiResponse,
  EvidenceDto,
  GastoF1Dto,
  PasoCriticoMeta,
  PasoCriticoIndicador,
  InformeComprobacionDto,
  CartaDto,
  ControlPlazoDto
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
  private pasoService = inject(PasoCriticoService);

  // Bandeja: EN_REVISION + AUDITADO_CAMPO + IN_REVISION_UN, filtrada por cartera en el backend.
  unRtfList = signal<RtfCabeceraDto[]>([]);
  unSelectedRtfId = signal<number | null>(null);
  dashboardUnData = signal<DashboardUnData | null>(null);

  // RTF seleccionado (self-contained: no depende de las signals de OaRtfService, que solo se
  // llenan del lado OA y podían quedar vacías/desactualizadas para el RTF que la UN abre).
  cabeceraSeleccionada = signal<RtfCabeceraDto | null>(null);
  // ADR-012: T1/R2 se resuelven contra BD_SEL (programada) + avance local ejecutado — la misma
  // fuente que usa oa-registro — en vez de las tablas legacy retiradas (SRT_TMD_METAFISICA/
  // INDICADOR). Gastos F1 es el snapshot local compartido con la OA, sincronizado explícitamente.
  metas = signal<PasoCriticoMeta[]>([]);
  indicadores = signal<PasoCriticoIndicador[]>([]);
  evidencias = signal<EvidenceDto[]>([]);
  gastosF1 = signal<GastoF1Dto[]>([]);
  ultimaSincronizacionGastosF1 = computed(() => {
    const fechas = this.gastosF1().map(g => g.fecRegistro).filter((f): f is string => !!f);
    return fechas.length ? fechas.reduce((max, f) => (f > max ? f : max)) : null;
  });

  rtfStatus = computed(() => this.cabeceraSeleccionada()?.estRtf ?? 'PENDIENTE');

  // Verificación de campo (Anexo 19, opcional) sobre el RTF seleccionado.
  urEvaluacionItems = signal<UrEvaluacionItemDto[]>([]);
  urActaCampoArchivo = signal<File | null>(null);

  // Anexo 18 - Informe de Comprobación (registrado por la UN, B-012).
  anexo18 = signal<InformeComprobacionDto | null>(null);

  // Cartas de Notificación/Notarial (control de plazos, Fase 4) sobre el RTF seleccionado.
  cartas = signal<CartaDto[]>([]);

  // ADR-012 de sigec-api-rtf/docs (Fase 4): plazo de 7 días para que la UN reevalúe un RTF
  // reenviado tras observación -- puramente informativo, null cuando no aplica (RTF nunca
  // observado, o envío inicial).
  plazoReevaluacion = signal<ControlPlazoDto | null>(null);

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
    const estados = [
      'EN_REVISION', 'AUDITADO_CAMPO', 'IN_REVISION_UN',
      // Control de plazos (Fase 4): RTFs vencidos, con Carta de Notificación o Carta Notarial
      // registrada, también son responsabilidad del especialista UN de la cartera.
      'VENCIDO', 'PLAZO_INICIAL_NOTIFICACION', 'PLAZO_LIMITE_NOTARIAL'
    ];
    // Antes: un forkJoin de 6 GET /rtfs?estado=X, uno por estado. Multiplicaba por 6, en cada
    // carga de bandeja, tanto los round-trips HTTP como las llamadas del backend a
    // sel-api-general (RtfCabeceraServicio.ListarRtfsPaginadoAsync ->
    // IClienteExternoRtf.ObtenerConveniosAsignadosAsync pide la misma cartera del usuario una
    // vez por estado). El backend ahora acepta `estados` (CSV) para resolver los 6 en una sola
    // llamada (ver ADR-013 y sigec-api-rtf/data/migrations/2026-09-13_sp_r_rtf_batch_estados.sql).
    //
    // `cantidad=1000` sigue siendo necesario: GET /rtfs pagina con `cantidad=10` por defecto
    // incluso en la rama "soloConveniosAsignados" del backend, que trae TODO de la BD para
    // filtrar por cartera pero igual trunca el resultado final con `.Skip(offset).Take(limit)`
    // usando ese valor por defecto — sin este parámetro, un especialista con más de 10 RTFs en
    // un mismo estado perdía los demás en silencio (el filtrado en cliente asume que
    // `unRtfList` ya tiene toda su cartera). Mismo patrón que
    // `ConvenioGeneralService.obtenerAsignados`.
    return this.http.get<ApiResponse<{ total: number; items: RtfCabeceraDto[] }>>(
      `${this.apiUrl}/rtfs?estados=${estados.join(',')}&cantidad=1000`
    ).pipe(
      map(res => {
        const items = res.datos?.items ?? [];
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
          this.evidencias.set(data.evidencias || []);
          // ADR-012: T1/R2/F1 ya no vienen en /completo — cada uno se carga por su endpoint
          // dedicado, la misma fuente que usa la OA.
          if (data.cabecera.idePasoCritico != null) {
            this.loadMetasPorPasoCritico(data.cabecera.idePasoCritico, rtfId).subscribe();
            this.loadIndicadoresPorPasoCritico(data.cabecera.idePasoCritico, rtfId).subscribe();
          }
          this.loadGastosF1(rtfId).subscribe();
        }
        return data;
      }),
      catchError(err => {
        console.error('Error loading RTF completo', err);
        return throwError(() => err);
      })
    );
  }

  /** Delega en PasoCriticoService (misma fuente BD_SEL que usa oa-registro) — ver ADR-012. */
  loadMetasPorPasoCritico(pasoCriticoId: number, ideRtf: number) {
    return this.pasoService.loadMetasPorPasoCritico(pasoCriticoId, ideRtf).pipe(
      tap(datos => this.metas.set(datos || []))
    );
  }

  /** Delega en PasoCriticoService (misma fuente BD_SEL que usa oa-registro) — ver ADR-012. */
  loadIndicadoresPorPasoCritico(pasoCriticoId: number, ideRtf: number) {
    return this.pasoService.loadIndicadoresPorPasoCritico(pasoCriticoId, ideRtf).pipe(
      tap(datos => this.indicadores.set(datos || []))
    );
  }

  /** Snapshot local compartido con la OA (ADR-012) — ya no es una llamada en vivo a KOFIX. */
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

  /** Cartas de Notificación/Notarial (control de plazos, Fase 4). */
  cargarCartas(rtfId: number) {
    return this.http.get<ApiResponse<CartaDto[]>>(`${this.apiUrl}/rtfs/${rtfId}/cartas`).pipe(
      map(res => {
        const cartas = res.datos ?? [];
        this.cartas.set(cartas);
        return cartas;
      }),
      catchError(err => {
        console.error('Error cargando las cartas del RTF', err);
        return throwError(() => err);
      })
    );
  }

  /**
   * ADR-012 de sigec-api-rtf/docs (Fase 4): plazo de reevaluación de la UN, filtrado
   * explícitamente por tipo -- a diferencia del plazo que consulta la OA (sin filtro), acá sí
   * hace falta el filtro para no mezclarlo con el plazo de subsanación de la OA, que es un dato
   * distinto aunque ambos vivan en la misma tabla.
   */
  cargarPlazoReevaluacion(rtfId: number) {
    return this.http.get<ApiResponse<ControlPlazoDto | null>>(
      `${this.apiUrl}/rtfs/${rtfId}/estado-plazo?tipPlazo=REEVALUACION_UN`
    ).pipe(
      map(res => {
        this.plazoReevaluacion.set(res.datos ?? null);
        return res.datos;
      }),
      catchError(err => {
        console.error('Error cargando el plazo de reevaluación del RTF', err);
        return throwError(() => err);
      })
    );
  }

  registrarCarta(rtfId: number, tipCarta: string, numDocumento: string, fecNotificacion: string, canDiasOtorgados: number, archivo: File) {
    const formData = new FormData();
    formData.append('tipCarta', tipCarta);
    formData.append('numDocumento', numDocumento);
    formData.append('fecNotificacion', fecNotificacion);
    formData.append('canDiasOtorgados', String(canDiasOtorgados));
    formData.append('archivo', archivo);

    return this.http.post<ApiResponse<CartaDto>>(`${this.apiUrl}/rtfs/${rtfId}/cartas`, formData).pipe(
      map(res => {
        if (res.datos) {
          this.cartas.update(cartas => [...cartas, res.datos as CartaDto]);
        }
        return res.datos ?? null;
      }),
      catchError(err => {
        console.error('Error registrando la carta', err);
        return throwError(() => err);
      })
    );
  }

  descargarCarta(rtfId: number, ideCarta: number) {
    return this.http.get(`${this.apiUrl}/rtfs/${rtfId}/cartas/${ideCarta}/descarga`, { responseType: 'blob' }).pipe(
      catchError(err => {
        console.error('Error descargando la carta', err);
        return throwError(() => err);
      })
    );
  }
}

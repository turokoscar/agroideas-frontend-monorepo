import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RtfService, EvidenceDto, CartaDto } from '../../core/services/rtf.service';
import { UrEvaluacionItemDto, UrEvaluacionItemKind, parseSeccionRevision } from '../../core/models';
import { ConvenioGeneralService } from '../../core/services/convenio-general.service';
import { ConvenioResumenDto } from '../../core/models';
import { formatConvenioNumber } from '@agroideas/utils';
import {
  ToastService,
  UiCountdownBannerComponent,
  UiPdfViewerComponent,
  UiDataTableComponent,
  TableColumn,
  UIButtonComponent,
  UiStatusPillComponent,
  StatusType,
  UiProgressBarComponent,
  UiDropzoneComponent,
  UiFileChipComponent,
  FileInfo,
  UiFilterBarComponent,
  UIModalComponent,
} from '@agroideas/ui';
import { Observable, Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DocumentacionRtfModalComponent } from '../documentacion-rtf/documentacion-rtf-modal.component';

interface Anexo18FormValue {
  txtNumeroInforme: string;
  txtRepresentanteUn: string;
  txtInformeUn: string;
  txtInformeVisita: string;
  txtInformeAmbiental: string;
  txtInformeFinanciero: string;
  txtDificultades: string;
  txtConclusiones: string;
  txtRecomendaciones: string;
  estCalificacion: '' | 'APROBADO_CONFORME' | 'RECHAZADO_OBSERVACIONES';
}

/**
 * ADR-010: pantalla única de la Unidad de Negocios (UN) para todo el ciclo de un expediente
 * — desde que llega (EN_REVISION) hasta que se aprueba/rechaza (IN_REVISION_UN). No existe un
 * actor "UR" separado: la verificación de campo (Anexo 19, sección opcional más abajo) la
 * ejecuta el mismo especialista UN, así que se fusiona en esta misma vista en vez de vivir en
 * una ruta/rol aparte (antes `UrAuditoriaComponent`).
 */
@Component({
  selector: 'app-un-gabinete',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    DatePipe,
    UiCountdownBannerComponent,
    UiPdfViewerComponent,
    UiDataTableComponent,
    UIButtonComponent,
    UiStatusPillComponent,
    UiProgressBarComponent,
    UiDropzoneComponent,
    UiFileChipComponent,
    UiFilterBarComponent,
    DocumentacionRtfModalComponent,
    UIModalComponent,
  ],
  providers: [DecimalPipe, DatePipe],
  templateUrl: './un-gabinete.component.html',
})
export class UnGabineteComponent implements OnInit, OnDestroy {
  rtfService = inject(RtfService);
  private toast = inject(ToastService);
  private http = inject(HttpClient);
  private convenioGeneralService = inject(ConvenioGeneralService);
  private subs = new Subscription();

  // View state
  viewState = signal<'list' | 'audit'>('list');
  loadingBandeja = signal(false);
  loadingCompleto = signal(false);
  accionEjecutandose = signal(false);

  // RUC/razón social/número de convenio no existen en sigec-api-rtf (solo ideConvenio) — se
  // resuelven contra sel-api-general, igual que en un-dashboard.component.ts.
  conveniosInfo = signal<Map<number, ConvenioResumenDto>>(new Map());

  bandejaColumns: TableColumn[] = [
    { field: 'ideRtf', header: 'ID RTF', type: 'text' },
    { field: 'ideConvenio', header: 'Convenio', type: 'custom' },
    { field: 'numPasoCritico', header: 'Paso Crítico', type: 'text' },
    { field: 'estRtf', header: 'Estado', type: 'custom' },
    { field: 'fecLimite', header: 'Fec. Límite', type: 'date' },
    { field: 'fecRegistro', header: 'Fec. Recepción', type: 'date' },
    { field: 'accion', header: 'Acción', type: 'custom', align: 'right' },
  ];

  /** Columnas de la pestaña "Plazos y Cobranza" (ADR-017 frontend): reemplaza Fec. Límite en texto
   *  plano por una columna de urgencia calculada (`diasRestantes`). */
  bandejaColumnasPlazos: TableColumn[] = [
    { field: 'ideRtf', header: 'ID RTF', type: 'text' },
    { field: 'ideConvenio', header: 'Convenio', type: 'custom' },
    { field: 'numPasoCritico', header: 'Paso Crítico', type: 'text' },
    { field: 'estRtf', header: 'Estado', type: 'custom' },
    { field: 'plazo', header: 'Plazo', type: 'custom' },
    { field: 'fecRegistro', header: 'Fec. Recepción', type: 'date' },
    { field: 'accion', header: 'Acción', type: 'custom', align: 'right' },
  ];

  /**
   * ADR-017 (frontend, apps/sigec-rtf/adr): separa la bandeja en dos pestañas -- "Evaluación" (revisión técnica del informe) y
   * "Plazos y Cobranza" (seguimiento administrativo/legal por incumplimiento, ADR-018 de
   * sigec-api-rtf). La unión de ambos sets debe seguir siendo exactamente los estados que
   * `UnGabineteService.loadBandejaUn()` consulta -- si se agrega un estado nuevo a
   * `EstadosBandejaUn` en el backend, hay que clasificarlo acá también, no hay validación
   * automática que lo fuerce.
   */
  private static readonly ESTADOS_EVALUACION = ['EN_REVISION', 'AUDITADO_CAMPO', 'IN_REVISION_UN'] as const;
  private static readonly ESTADOS_PLAZOS = [
    'VENCIDO', 'PLAZO_INICIAL_NOTIFICACION', 'EN_DESACATO', 'PLAZO_LIMITE_NOTARIAL', 'BLOQUEO_DEFINITIVO',
  ] as const;

  /** Orden de severidad dentro de la pestaña de plazos -- más crítico primero, no por fecha. */
  private static readonly SEVERIDAD_ESTADO: Record<string, number> = {
    'BLOQUEO_DEFINITIVO': 0,
    'PLAZO_LIMITE_NOTARIAL': 1,
    'EN_DESACATO': 2,
    'PLAZO_INICIAL_NOTIFICACION': 3,
    'VENCIDO': 4,
  };

  activeTab = signal<'evaluacion' | 'plazos'>('evaluacion');

  cambiarTab(tab: 'evaluacion' | 'plazos') {
    this.activeTab.set(tab);
    // Un estado seleccionado en la pestaña anterior no existe en el dropdown de la nueva --
    // se resetea para no dejar un filtro "fantasma" que no matchea ninguna opción visible.
    this.filtroEstado.set('');
  }

  /** Estados que corresponden a la pestaña activa (alimenta el filtro y el dropdown "Estado"). */
  estadosPestanaActiva = computed(() =>
    this.activeTab() === 'evaluacion' ? UnGabineteComponent.ESTADOS_EVALUACION : UnGabineteComponent.ESTADOS_PLAZOS
  );

  columnasPestanaActiva = computed(() =>
    this.activeTab() === 'evaluacion' ? this.bandejaColumns : this.bandejaColumnasPlazos
  );

  conteoEvaluacion = computed(() =>
    this.unRtfList().filter(rtf => (UnGabineteComponent.ESTADOS_EVALUACION as readonly string[]).includes(rtf.estRtf ?? '')).length
  );
  conteoPlazos = computed(() =>
    this.unRtfList().filter(rtf => (UnGabineteComponent.ESTADOS_PLAZOS as readonly string[]).includes(rtf.estRtf ?? '')).length
  );

  /** Fila-fuente de la pestaña activa, antes de aplicar texto/estado/fecha (ver `bandejaFiltrada`). */
  private bandejaPorPestana = computed(() => {
    const estados = this.estadosPestanaActiva() as readonly string[];
    return this.unRtfList().filter(rtf => estados.includes(rtf.estRtf ?? ''));
  });

  // Filtros de la bandeja (ADR-013): se resuelven en el cliente — texto, estado y fecha
  // límite ya están completos en memoria (unRtfList + conveniosInfo), sin volver al backend.
  readonly estadosBandeja = [...UnGabineteComponent.ESTADOS_EVALUACION, ...UnGabineteComponent.ESTADOS_PLAZOS] as const;

  filtroTexto = signal('');
  filtroEstado = signal('');
  filtroFecDesde = signal('');
  filtroFecHasta = signal('');

  private normalizar(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  bandejaFiltrada = computed(() => {
    const texto = this.normalizar(this.filtroTexto());
    const estado = this.filtroEstado();
    const fecDesde = this.filtroFecDesde();
    const fecHasta = this.filtroFecHasta();
    const conveniosInfo = this.conveniosInfo();

    const filtradas = this.bandejaPorPestana().filter(rtf => {
      if (estado && rtf.estRtf !== estado) return false;

      if (fecDesde && rtf.fecLimite < fecDesde) return false;
      if (fecHasta && rtf.fecLimite.slice(0, 10) > fecHasta) return false;

      if (texto) {
        const info = conveniosInfo.get(rtf.ideConvenio);
        const haystack = this.normalizar(
          [info ? this.formatConvenio(info) : String(rtf.ideConvenio), info?.ruc, info?.razonSocial]
            .filter(Boolean)
            .join(' ')
        );
        if (!haystack.includes(texto)) return false;
      }

      return true;
    });

    if (this.activeTab() === 'plazos') {
      return [...filtradas].sort((a, b) =>
        (UnGabineteComponent.SEVERIDAD_ESTADO[a.estRtf ?? ''] ?? 99) - (UnGabineteComponent.SEVERIDAD_ESTADO[b.estRtf ?? ''] ?? 99)
      );
    }
    return filtradas;
  });

  /** ADR-017 (frontend): mismo criterio que `BandejaOAComponent.diasRestantes` -- urgencia calculada sobre
   *  `fecLimite` (el plazo original de 15 días; los escalones posteriores no lo actualizan, ver
   *  ADR-018 de sigec-api-rtf, así que el número crece con cada etapa mas no reinicia). */
  diasRestantes(fecLimite?: string): { texto: string; urgente: boolean } {
    if (!fecLimite) return { texto: '—', urgente: false };
    const hoy = new Date();
    const limite = new Date(fecLimite);
    const dias = Math.ceil((limite.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    if (dias < 0) return { texto: `Vencido hace ${Math.abs(dias)}d`, urgente: true };
    if (dias === 0) return { texto: 'Vence hoy', urgente: true };
    return { texto: `Vence en ${dias}d`, urgente: dias <= 3 };
  }

  // UN signals (self-contained, ver un-gabinete.service.ts)
  unRtfList = this.rtfService.unRtfList;
  cabecera = this.rtfService.unCabeceraSeleccionada;
  metas = this.rtfService.unMetas;
  indicadores = this.rtfService.unIndicadores;
  evidencias = this.rtfService.unEvidencias;
  gastosF1 = this.rtfService.unGastosF1;
  ultimaSincronizacionGastosF1 = this.rtfService.unUltimaSincronizacionGastosF1;
  sincronizandoGastosF1 = signal(false);
  rtfStatus = this.rtfService.unRtfStatus;
  anexo18 = this.rtfService.unAnexo18;

  // Formulario del Anexo 18 (B-012) — conclusiones, recomendaciones y calificación final.
  anexo18Form = signal<Anexo18FormValue>({
    txtNumeroInforme: '',
    txtRepresentanteUn: '',
    txtInformeUn: '',
    txtInformeVisita: '',
    txtInformeAmbiental: '',
    txtInformeFinanciero: '',
    txtDificultades: '',
    txtConclusiones: '',
    txtRecomendaciones: '',
    estCalificacion: '',
  });
  guardandoAnexo18 = signal(false);

  // Control de Plazos - Cartas de Notificación/Notarial (Fase 4)
  cartas = this.rtfService.unCartas;

  // ADR-012 de sigec-api-rtf/docs (Fase 4): plazo informativo de 7 días para reevaluar un RTF
  // reenviado tras observación -- no confundir con el "Fase 4" de arriba, que es del plan de
  // implementación original del propio frontend (apps/sigec-rtf/adr), un documento distinto.
  plazoReevaluacion = this.rtfService.unPlazoReevaluacion;
  tieneReevaluacionPendiente = computed(() => this.plazoReevaluacion() !== null);
  horasRestantesReevaluacion = computed(() => this.plazoReevaluacion()?.horasRestantes ?? 0);
  nuevaCartaTipo = signal<'PRIMERA_NOTIFICACION' | 'CARTA_NOTARIAL'>('PRIMERA_NOTIFICACION');
  nuevaCartaNumDocumento = signal('');
  nuevaCartaFecNotificacion = signal(new Date().toISOString().slice(0, 10));
  nuevaCartaDias = signal(15);
  nuevaCartaArchivo = signal<File | null>(null);
  registrandoCarta = signal(false);

  // Visor de PDF real (pdfjs-dist, Fase 5) para evidencias, cartas y Anexo 17/18.
  pdfViewerOpen = signal(false);
  pdfViewerFilename = signal<string | null>(null);
  pdfViewerFileUrl = signal<string | null>(null);
  pdfViewerDownloadUrl = signal<string | null>(null);

  // Devolver form (desde IN_REVISION_UN)
  showDevolverForm = signal(false);
  devolverObservacion = signal('');

  // Devolver temprano (desde EN_REVISION/AUDITADO_CAMPO, antes de continuar la evaluación)
  showDevolverTempranoForm = signal(false);

  // Verificación de campo (Anexo 19, opcional) — ver ADR-010. Solo queda el Acta de Campo
  // (subida de archivo); la evaluación Conforme/Observado por fila que existía aquí dependía de
  // metas/indicadores locales del flujo "sin paso crítico" (ADR-006 §9), retirado por ADR-012 —
  // por eso "continuar"/"devolver a OA" ya no tienen ninguna condición que cumplir más allá de
  // no tener otra acción en curso (`accionEjecutandose`).
  actaSubida = signal(false);
  actaFileName = signal('');

  // Solo aplica antes de que el expediente llegue a IN_REVISION_UN.
  estaEnEvaluacionPrevia = computed(() => ['EN_REVISION', 'AUDITADO_CAMPO'].includes(this.rtfStatus()));

  /** ADR-019 (frontend): pestañas del contenido siempre-visible (R1/T1/R2/F1) del detalle del
   *  RTF -- se reinicia a 'r1' en `seleccionarRtf` al abrir un expediente distinto. */
  activeContentTab = signal<'r1' | 't1' | 'r2' | 'f1'>('r1');

  /** Badges de las pestañas T1/R2 (ADR-019): cuántas filas ya se marcaron OBSERVADO en el
   *  borrador de evaluación en curso -- solo tiene sentido mientras se puede evaluar. */
  metasObservadasCount = computed(() =>
    this.estaEnEvaluacionPrevia() ? this.metas().filter(m => this.dictamenDe('META', m.id) === 'OBSERVADO').length : 0
  );
  indicadoresObservadasCount = computed(() =>
    this.estaEnEvaluacionPrevia() ? this.indicadores().filter(i => this.dictamenDe('INDICADOR', i.id) === 'OBSERVADO').length : 0
  );

  // --- ADR-014 Parte 4: evaluación por ítem (T1/R2/R1) ---
  // Borrador en memoria de la evaluación en curso, sembrado desde `GET .../evaluaciones` al
  // abrir el expediente y desde ahí editado por el evaluador antes de guardar. Clave:
  // `${kind}:${id}` (para R1, id es el propio ideRtf — solo hace falta que sea estable, ya que
  // cada fila ya está acotada por ide_rtf en la base de datos).
  private evaluacionDraft = signal<Map<string, UrEvaluacionItemDto>>(new Map());
  guardandoEvaluacion = signal(false);
  pliegoObservaciones = this.rtfService.pliegoObservaciones;
  devolverTempranoObservacion = signal('');

  /**
   * ADR-016 Fase 6 (sigec-api-rtf): respuesta de la OA a cada observación, de solo lectura --
   * vive separada de `evaluacionDraft` a propósito, para que nunca se reenvíe por accidente en
   * `guardarEvaluacion()` (ese payload es exclusivamente lo que la UN edita). Misma clave
   * `${kind}:${id}` que el borrador. Se pierde junto con el resto del ciclo cuando la UN vuelve
   * a evaluar (`EliminarRevisionesPorPrefijoAsync` purga y recrea todo) -- solo el ciclo
   * vigente es visible, por diseño (ADR-016 punto 6).
   */
  private respuestasOa = signal<Map<string, string>>(new Map());

  private claveItem(kind: UrEvaluacionItemKind, id: number): string {
    return `${kind}:${id}`;
  }

  private itemDraft(kind: UrEvaluacionItemKind, id: number): UrEvaluacionItemDto | undefined {
    return this.evaluacionDraft().get(this.claveItem(kind, id));
  }

  dictamenDe(kind: UrEvaluacionItemKind, id: number): 'CONFORME' | 'OBSERVADO' {
    return this.itemDraft(kind, id)?.estConformidad ?? 'CONFORME';
  }

  observacionDe(kind: UrEvaluacionItemKind, id: number): string {
    return this.itemDraft(kind, id)?.txtObservacion ?? '';
  }

  subsanableDe(kind: UrEvaluacionItemKind, id: number): boolean {
    return this.itemDraft(kind, id)?.estSubsanable ?? true;
  }

  /** ADR-016 Fase 6: respuesta que dejó la OA al atender esta observación, si ya lo hizo. */
  respuestaOaDe(kind: UrEvaluacionItemKind, id: number): string | undefined {
    return this.respuestasOa().get(this.claveItem(kind, id));
  }

  /** Categoría por defecto según el tipo de ítem — el evaluador no elige categoría a mano por fila. */
  private categoriaDefecto(kind: UrEvaluacionItemKind): 'TECNICA_FISICA' | 'CUALITATIVA' {
    return kind === 'R1' ? 'CUALITATIVA' : 'TECNICA_FISICA';
  }

  actualizarDictamen(kind: UrEvaluacionItemKind, id: number, dictamen: 'CONFORME' | 'OBSERVADO') {
    this.evaluacionDraft.update(mapa => {
      const nuevo = new Map(mapa);
      const clave = this.claveItem(kind, id);
      const actual = nuevo.get(clave);
      nuevo.set(clave, {
        id,
        kind,
        estConformidad: dictamen,
        txtObservacion: actual?.txtObservacion,
        txtCategoria: this.categoriaDefecto(kind),
        estSubsanable: dictamen === 'OBSERVADO' ? (actual?.estSubsanable ?? true) : undefined,
      });
      return nuevo;
    });
  }

  actualizarObservacion(kind: UrEvaluacionItemKind, id: number, texto: string) {
    this.evaluacionDraft.update(mapa => {
      const nuevo = new Map(mapa);
      const clave = this.claveItem(kind, id);
      const actual = nuevo.get(clave);
      nuevo.set(clave, {
        id,
        kind,
        estConformidad: actual?.estConformidad ?? 'CONFORME',
        txtObservacion: texto,
        txtCategoria: this.categoriaDefecto(kind),
        estSubsanable: actual?.estSubsanable ?? true,
      });
      return nuevo;
    });
  }

  actualizarSubsanable(kind: UrEvaluacionItemKind, id: number, subsanable: boolean) {
    this.evaluacionDraft.update(mapa => {
      const nuevo = new Map(mapa);
      const clave = this.claveItem(kind, id);
      const actual = nuevo.get(clave);
      if (!actual) return mapa;
      nuevo.set(clave, { ...actual, estSubsanable: subsanable });
      return nuevo;
    });
  }

  /** Cuadro Cualitativo (R1) — un solo veredicto para toda la sección, no por pregunta. */
  r1Id(): number {
    return this.rtfService.unSelectedRtfId() ?? 0;
  }
  dictamenR1 = computed(() => this.dictamenDe('R1', this.r1Id()));
  observacionR1 = computed(() => this.observacionDe('R1', this.r1Id()));
  /** ADR-016 Fase 6. */
  respuestaOaR1 = computed(() => this.respuestaOaDe('R1', this.r1Id()));

  /**
   * Construye el arreglo completo a enviar: una entrada por cada meta/indicador real (default
   * Conforme si el evaluador no la tocó, para que la cobertura la cuente sin obligar a hacer
   * clic en cada fila) más R1 si el evaluador lo usó.
   */
  private construirItemsEvaluacion(rtfId: number): UrEvaluacionItemDto[] {
    const items: UrEvaluacionItemDto[] = [
      ...this.metas().map(m => this.itemDraft('META', m.id) ?? {
        id: m.id, kind: 'META' as const, estConformidad: 'CONFORME' as const, txtCategoria: 'TECNICA_FISICA' as const,
      }),
      ...this.indicadores().map(i => this.itemDraft('INDICADOR', i.id) ?? {
        id: i.id, kind: 'INDICADOR' as const, estConformidad: 'CONFORME' as const, txtCategoria: 'TECNICA_FISICA' as const,
      }),
    ];
    const r1 = this.itemDraft('R1', rtfId);
    if (r1) items.push(r1);
    return items;
  }

  /** Reconstruye el borrador desde las filas ya guardadas (`GET .../evaluaciones`), al abrir el expediente. */
  private cargarEvaluacionUr(rtfId: number) {
    this.subs.add(
      this.rtfService.obtenerEvaluacionUr(rtfId).subscribe({
        next: (estado) => {
          const mapa = new Map<string, UrEvaluacionItemDto>();
          const respuestas = new Map<string, string>();
          for (const rev of estado?.revisiones ?? []) {
            const parsed = parseSeccionRevision(rev.txtSeccion);
            if (!parsed) continue;
            const { kind, id } = parsed;
            const clave = this.claveItem(kind, id);
            mapa.set(clave, {
              id,
              kind,
              estConformidad: rev.estConformidad,
              txtObservacion: rev.txtObservacion,
              txtCategoria: rev.txtCategoria as any,
              estSubsanable: rev.estSubsanable,
            });
            if (rev.txtRespuestaOa) {
              respuestas.set(clave, rev.txtRespuestaOa);
            }
          }
          this.evaluacionDraft.set(mapa);
          this.respuestasOa.set(respuestas);
        },
        error: () => { /* silencioso: la pantalla sigue usable sin evaluación previa cargada */ }
      })
    );
  }

  guardarEvaluacion() {
    const rtfId = this.rtfService.unSelectedRtfId();
    if (!rtfId) return;

    this.guardandoEvaluacion.set(true);
    this.subs.add(
      this.rtfService.guardarEvaluacionUr(rtfId, this.construirItemsEvaluacion(rtfId)).subscribe({
        next: () => {
          this.guardandoEvaluacion.set(false);
          this.toast.success('Evaluación guardada', 'Se registraron las evaluaciones por ítem.');
          this.cargarEvaluacionUr(rtfId);
        },
        error: (err) => {
          this.guardandoEvaluacion.set(false);
          this.toast.error('Error', err.error?.mensaje || 'No se pudo guardar la evaluación.');
        }
      })
    );
  }

  // Control de Plazos (Fase 4; ADR-018 Fase C suma EN_DESACATO): RTF vencido, con Carta de
  // Notificación o Carta Notarial en curso -- todavía tiene sentido seguir emitiendo cartas.
  // BLOQUEO_DEFINITIVO es un estado terminal aparte (ver enBloqueoDefinitivo): ya no hay más
  // cartas que registrar, solo queda la acción manual de marcar el convenio como resuelto.
  enControlDePlazo = computed(() =>
    ['VENCIDO', 'PLAZO_INICIAL_NOTIFICACION', 'EN_DESACATO', 'PLAZO_LIMITE_NOTARIAL'].includes(this.rtfStatus())
  );

  /** ADR-018 Fase F: estado terminal del escalamiento de plazos -- ver marcarConvenioResuelto(). */
  enBloqueoDefinitivo = computed(() => this.rtfStatus() === 'BLOQUEO_DEFINITIVO');

  private static readonly ESTADO_LABELS: Record<string, string> = {
    'EN_REVISION': 'En Revisión',
    'AUDITADO_CAMPO': 'Verificación de Campo Registrada',
    'IN_REVISION_UN': 'En Evaluación de Gabinete',
    'APROBADO': 'Aprobado',
    'RECHAZADO': 'Rechazado',
    'OBSERVADO': 'Observado',
    'VENCIDO': 'Plazo Vencido',
    'PLAZO_INICIAL_NOTIFICACION': 'Carta de Notificación Enviada',
    'EN_DESACATO': 'En Desacato',
    'PLAZO_LIMITE_NOTARIAL': 'Carta Notarial - Plazo Final',
    'BLOQUEO_DEFINITIVO': 'Bloqueo Definitivo',
  };

  /** Usado tanto por la fila de la bandeja como por la cabecera del detalle (rtfStatusLabel). */
  estadoLabel(estado?: string): string {
    if (!estado) return '';
    return UnGabineteComponent.ESTADO_LABELS[estado] ?? estado;
  }

  rtfStatusLabel = computed(() => this.estadoLabel(this.rtfStatus()));

  ultimaCarta = computed<CartaDto | null>(() => {
    const cartas = this.cartas();
    if (cartas.length === 0) return null;
    return [...cartas].sort((a, b) => new Date(b.fecNotificacion).getTime() - new Date(a.fecNotificacion).getTime())[0];
  });

  /**
   * Réplica en el cliente de `CalculadoraPlazos.CalcularFechaLimite` (sigec-api-rtf, ADR-012
   * Fase 1) -- corrige un desajuste real detectado al implementar Fase 4: este cómputo sumaba los
   * días directamente desde `fecNotificacion` (sin el +1 día de "surte efecto al día siguiente" ni
   * el traslado al lunes si cae fin de semana), así que la UI podía mostrar una fecha límite
   * distinta a la que `ControlPlazoServicio.VerificarBloqueosDefinitivosAsync` realmente aplica.
   */
  private siguienteDiaHabil(fecha: Date): Date {
    const dia = fecha.getDay(); // 0 = domingo, 6 = sábado
    if (dia === 6) return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + 2);
    if (dia === 0) return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + 1);
    return fecha;
  }

  fecLimiteCarta = computed<Date | null>(() => {
    const carta = this.ultimaCarta();
    if (!carta) return null;
    const fecha = new Date(carta.fecNotificacion);
    fecha.setDate(fecha.getDate() + 1 + carta.canDiasOtorgados); // notificación electrónica: surte efecto al día siguiente
    return this.siguienteDiaHabil(fecha);
  });

  horasRestantesCarta = computed(() => {
    const fecLimite = this.fecLimiteCarta();
    if (!fecLimite) return 0;
    return Math.max(0, (fecLimite.getTime() - Date.now()) / 3_600_000);
  });

  nuevaCartaFormValida = computed(() =>
    !!this.nuevaCartaNumDocumento().trim() &&
    !!this.nuevaCartaFecNotificacion() &&
    this.nuevaCartaDias() > 0 &&
    !!this.nuevaCartaArchivo()
  );

  // R1 items para la vista
  r1Items = computed(() => [
    { label: 'Actividades Realizadas', value: this.cabecera()?.txtActividadesRealizadas },
    { label: 'Actividades No Realizadas', value: this.cabecera()?.txtActividadesNoRealizadas },
    { label: 'Logros', value: this.cabecera()?.txtLogros },
    { label: 'Dificultades', value: this.cabecera()?.txtDificultades },
    { label: 'Cambios en el Paso', value: this.cabecera()?.txtCambiosPaso },
  ]);

  /**
   * Toda evidencia de este RTF es de una meta física o un indicador específico (nunca "sustento
   * general" — la propia regla V2 de envío del backend lo exige así: RtfCabeceraServicio.
   * EnviarRtfAsync valida `ideConcepto == IdeMetaPasoCritico && tipConcepto == 'METAFISICA'`).
   * Se agrupa una sola vez por (tipConcepto, ideConcepto) para no filtrar el arreglo completo en
   * cada fila de T1/R2.
   */
  private evidenciasPorConcepto = computed(() => {
    const mapa = new Map<string, EvidenceDto[]>();
    for (const ev of this.evidencias()) {
      const clave = `${ev.tipConcepto}:${ev.ideConcepto}`;
      const lista = mapa.get(clave);
      if (lista) lista.push(ev); else mapa.set(clave, [ev]);
    }
    return mapa;
  });

  evidenciasDeMeta(metaId: number): EvidenceDto[] {
    return this.evidenciasPorConcepto().get(`METAFISICA:${metaId}`) ?? [];
  }

  evidenciasDeIndicador(indicadorId: number): EvidenceDto[] {
    return this.evidenciasPorConcepto().get(`INDICADOR:${indicadorId}`) ?? [];
  }

  /**
   * ADR-014 Parte 4: checklist de admisibilidad derivado de reglas ya existentes (no hay
   * catálogo administrable en v1) — Anexo 17 congelado, al menos una evidencia PDF, y Acta de
   * Campo si el expediente ya pasó por verificación (`AUDITADO_CAMPO` en adelante).
   */
  checklistAdmisibilidad = computed(() => {
    const estado = this.rtfStatus();
    const yaAuditado = estado !== 'EN_REVISION';
    return [
      { label: 'Anexo 17 generado', cumple: !!this.cabecera()?.txtStoragePdf },
      { label: 'Al menos una evidencia PDF adjunta', cumple: this.evidencias().length > 0 },
      { label: 'Acta de Campo (Anexo 19)', cumple: !yaAuditado || this.actaSubida(), aplica: yaAuditado },
    ];
  });

  anexo18Empty = computed(() => !this.anexo18());

  anexo18FormValido = computed(() => {
    const f = this.anexo18Form();
    return !!f.txtNumeroInforme.trim() && !!f.txtRepresentanteUn.trim();
  });

  // Copia escaneada del Anexo 18 ya firmado — mismo patrón que el Anexo 17 firmado de la OA
  // (evidencia genérica, tipConcepto ANEXO18_FIRMADO), para que quede junto al resto de la
  // documentación del expediente (evidencias, informes, Anexo 17) consultable por PC.
  anexo18FirmadosAdjuntos = computed(() =>
    this.evidencias().filter(e => e.tipConcepto === 'ANEXO18_FIRMADO')
  );
  subiendoAnexo18Firmado = signal(false);

  ngOnInit() {
    this.cargarBandeja();
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  /** Mismo formato que kofix-ejecucion y un-dashboard.component.ts: NNNN-YYYY-ST. */
  formatConvenio(info: ConvenioResumenDto): string {
    return formatConvenioNumber(info.numeroConvenio, info.fechaFirma);
  }

  /**
   * ui-status-pill (@agroideas/ui) tiene una paleta cerrada de estados genéricos que no incluye
   * los estados propios del flujo RTF — se aproxima cada uno a la paleta más cercana solo para
   * el color; la etiqueta real se pasa aparte vía `[text]="rtfStatusLabel()"`.
   */
  estadoPillStatus(estado?: string): StatusType {
    switch (estado) {
      case 'IN_REVISION_UN': return 'Aprobado';
      case 'AUDITADO_CAMPO': return 'Media';
      case 'VENCIDO':
      case 'EN_DESACATO':
      case 'PLAZO_LIMITE_NOTARIAL':
      case 'BLOQUEO_DEFINITIVO': return 'Rechazado';
      case 'PLAZO_INICIAL_NOTIFICACION': return 'Pendiente';
      default: return 'Pendiente';
    }
  }

  private cargarBandeja() {
    this.loadingBandeja.set(true);
    this.subs.add(
      this.rtfService.loadBandejaUn().subscribe({
        next: items => {
          this.loadingBandeja.set(false);
          this.cargarConveniosInfo(items.map(rtf => rtf.ideConvenio));
        },
        error: () => { this.loadingBandeja.set(false); this.toast.error('Error', 'No se pudo cargar la bandeja.'); }
      })
    );
  }

  // ADR-013: convenios/por-ids en vez de "mi cartera" (convenios/asignados) — la anterior
  // devolvía vacío para un Administrador del sistema, dejando los convenios sin formatear.
  private cargarConveniosInfo(ideConvenios: number[]) {
    this.subs.add(
      this.convenioGeneralService.obtenerPorIds([...new Set(ideConvenios)]).subscribe(mapa => this.conveniosInfo.set(mapa))
    );
  }

  seleccionarRtf(rtfId: number) {
    this.rtfService.unSelectedRtfId.set(rtfId);
    this.loadingCompleto.set(true);
    this.viewState.set('audit');
    this.activeContentTab.set('r1');
    this.showDevolverForm.set(false);
    this.showDevolverTempranoForm.set(false);
    this.devolverObservacion.set('');
    this.anexo18Form.set({
      txtNumeroInforme: '',
      txtRepresentanteUn: '',
      txtInformeUn: '',
      txtInformeVisita: '',
      txtInformeAmbiental: '',
      txtInformeFinanciero: '',
      txtDificultades: '',
      txtConclusiones: '',
      txtRecomendaciones: '',
      estCalificacion: '',
    });
    this.actaSubida.set(false);
    this.actaFileName.set('');
    this.nuevaCartaNumDocumento.set('');
    this.nuevaCartaFecNotificacion.set(new Date().toISOString().slice(0, 10));
    this.nuevaCartaDias.set(15);
    this.nuevaCartaArchivo.set(null);
    this.evaluacionDraft.set(new Map());
    this.devolverTempranoObservacion.set('');

    this.subs.add(
      this.rtfService.loadRtfCompleto(rtfId).subscribe({
        next: (data) => {
          this.loadingCompleto.set(false);
          if (data?.cabecera.estRtf === 'AUDITADO_CAMPO') {
            this.actaSubida.set(true);
            this.actaFileName.set('Acta de Campo registrada');
          }
          this.cargarAnexo18(rtfId);
          this.cargarCartas(rtfId);
          this.cargarPlazoReevaluacion(rtfId);
          this.cargarEvaluacionUr(rtfId);
        },
        error: () => {
          this.loadingCompleto.set(false);
          this.toast.error('Error al cargar el RTF completo');
        }
      })
    );
  }

  private cargarCartas(rtfId: number) {
    this.subs.add(
      this.rtfService.cargarCartas(rtfId).subscribe()
    );
  }

  private cargarPlazoReevaluacion(rtfId: number) {
    this.subs.add(
      this.rtfService.cargarPlazoReevaluacion(rtfId).subscribe()
    );
  }

  private cargarAnexo18(rtfId: number) {
    this.subs.add(
      this.rtfService.cargarAnexo18(rtfId).subscribe({
        next: (informe) => {
          if (informe) {
            this.anexo18Form.set({
              txtNumeroInforme: informe.txtNumeroInforme ?? '',
              txtRepresentanteUn: informe.txtRepresentanteUn ?? '',
              txtInformeUn: informe.txtInformeUn ?? '',
              txtInformeVisita: informe.txtInformeVisita ?? '',
              txtInformeAmbiental: informe.txtInformeAmbiental ?? '',
              txtInformeFinanciero: informe.txtInformeFinanciero ?? '',
              txtDificultades: informe.txtDificultades ?? '',
              txtConclusiones: informe.txtConclusiones ?? '',
              txtRecomendaciones: informe.txtRecomendaciones ?? '',
              estCalificacion: (informe.estCalificacion as any) ?? '',
            });
          }
        },
      })
    );
  }

  volverBandeja() {
    this.viewState.set('list');
    this.rtfService.unSelectedRtfId.set(null);
    this.cargarBandeja();
  }

  toggleDevolverForm() {
    this.showDevolverForm.update(v => !v);
    if (!this.showDevolverForm()) {
      this.devolverObservacion.set('');
    }
  }

  // --- Verificación de campo (Anexo 19, opcional) ---

  onActaFile(info: FileInfo) {
    this.uploadActa(info.file);
  }

  private uploadActa(file: File) {
    const rtfId = this.rtfService.unSelectedRtfId();
    if (!rtfId) return;

    this.subs.add(
      this.rtfService.uploadActaCampo(rtfId, file).subscribe({
        next: () => {
          this.actaSubida.set(true);
          this.actaFileName.set(file.name);
          this.toast.success('Anexo 19 registrado', 'Verificación de campo registrada.');
        },
        error: () => this.toast.error('Error', 'No se pudo registrar el Acta de Campo.')
      })
    );
  }

  toggleDevolverTempranoForm() {
    this.showDevolverTempranoForm.update(v => !v);
  }

  /**
   * ADR-014 Parte 4: `PoliticaEvaluacionUr` (backend) exige cobertura completa antes de Derivar
   * o Devolver — Devolver además exige al menos una fila Observada con comentario. Se guarda el
   * borrador actual primero para no depender de que el evaluador haya pulsado "Guardar
   * Evaluación" por separado; si el guardado falla, no se intenta la transición.
   */
  private guardarEvaluacionYLuego(rtfId: number, siguiente: () => void, mensajeErrorGuardado: string) {
    this.subs.add(
      this.rtfService.guardarEvaluacionUr(rtfId, this.construirItemsEvaluacion(rtfId)).subscribe({
        next: () => siguiente(),
        error: (err) => {
          this.accionEjecutandose.set(false);
          this.toast.error('Error', err.error?.mensaje || mensajeErrorGuardado);
        }
      })
    );
  }

  /** Devuelve a la OA desde EN_REVISION/AUDITADO_CAMPO, antes de llegar a IN_REVISION_UN. */
  devolverTemprano() {
    const rtfId = this.rtfService.unSelectedRtfId();
    if (!rtfId) return;

    this.accionEjecutandose.set(true);
    this.guardarEvaluacionYLuego(rtfId, () => {
      this.subs.add(
        this.rtfService.devolverTemprano(rtfId, this.devolverTempranoObservacion()).subscribe({
          next: () => {
            this.accionEjecutandose.set(false);
            this.toast.warning('Devuelto a la OA', 'RTF devuelto como Observado.');
            this.volverBandeja();
          },
          error: (err) => {
            this.accionEjecutandose.set(false);
            this.toast.error('Error', err.error?.mensaje || 'No se pudo devolver el RTF.');
          }
        })
      );
    }, 'No se pudo guardar la evaluación antes de devolver.');
  }

  /** Continúa la evaluación desde EN_REVISION/AUDITADO_CAMPO hacia IN_REVISION_UN. */
  continuarEvaluacion() {
    const rtfId = this.rtfService.unSelectedRtfId();
    if (!rtfId) return;

    this.accionEjecutandose.set(true);
    this.guardarEvaluacionYLuego(rtfId, () => {
      this.subs.add(
        this.rtfService.derivarUn(rtfId).subscribe({
          next: () => {
            this.accionEjecutandose.set(false);
            this.toast.success('Evaluación continuada', 'El expediente pasó a evaluación final.');
            this.seleccionarRtf(rtfId);
          },
          error: (err) => {
            this.accionEjecutandose.set(false);
            this.toast.error('Error', err.error?.mensaje || 'No se pudo continuar la evaluación.');
          }
        })
      );
    }, 'No se pudo guardar la evaluación antes de continuar.');
  }

  // --- Evidencias, Anexo 18, Aprobar/Rechazar/Devolver (IN_REVISION_UN) ---

  /** Abre el visor de PDF real (pdfjs-dist) para el documento que resuelva blob$. */
  private openPdfViewer(filename: string, blob$: Observable<Blob>) {
    this.pdfViewerFilename.set(filename);
    this.pdfViewerFileUrl.set(null);
    this.pdfViewerDownloadUrl.set(null);
    this.pdfViewerOpen.set(true);

    this.subs.add(
      blob$.subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          this.pdfViewerFileUrl.set(url);
          this.pdfViewerDownloadUrl.set(url);
        },
        error: () => {
          this.toast.error('Error', 'No se pudo cargar el documento PDF.');
          this.pdfViewerOpen.set(false);
        }
      })
    );
  }

  closePdfViewer() {
    const url = this.pdfViewerFileUrl();
    if (url) URL.revokeObjectURL(url);
    this.pdfViewerOpen.set(false);
    this.pdfViewerFileUrl.set(null);
    this.pdfViewerDownloadUrl.set(null);
  }

  descargarEvidencia(ev: EvidenceDto) {
    if (!ev.ideEvidencia) return;
    this.openPdfViewer(ev.txtNombreArchivo || `evidencia_${ev.ideEvidencia}.pdf`, this.rtfService.downloadEvidencia(ev.ideEvidencia));
  }

  updateAnexo18Form(patch: Partial<Anexo18FormValue>) {
    this.anexo18Form.update(f => ({ ...f, ...patch }));
  }

  guardarAnexo18() {
    const rtfId = this.rtfService.unSelectedRtfId();
    if (!rtfId || !this.anexo18FormValido()) return;

    this.guardandoAnexo18.set(true);
    const f = this.anexo18Form();
    this.subs.add(
      this.rtfService.guardarAnexo18(rtfId, {
        txtNumeroInforme: f.txtNumeroInforme,
        txtRepresentanteUn: f.txtRepresentanteUn,
        txtInformeUn: f.txtInformeUn,
        txtInformeVisita: f.txtInformeVisita,
        txtInformeAmbiental: f.txtInformeAmbiental,
        txtInformeFinanciero: f.txtInformeFinanciero,
        txtDificultades: f.txtDificultades,
        txtConclusiones: f.txtConclusiones,
        txtRecomendaciones: f.txtRecomendaciones,
        estCalificacion: f.estCalificacion || undefined,
      }).subscribe({
        next: () => {
          this.guardandoAnexo18.set(false);
          this.toast.success('Anexo 18 guardado', 'Informe de comprobación registrado con éxito.');
        },
        error: (err) => {
          this.guardandoAnexo18.set(false);
          this.toast.error('Error', err.error?.mensaje || 'No se pudo guardar el Anexo 18.');
        }
      })
    );
  }

  onAnexo18FirmadoFile(info: FileInfo) {
    const rtfId = this.rtfService.unSelectedRtfId();
    if (!rtfId) return;

    this.subiendoAnexo18Firmado.set(true);
    this.subs.add(
      this.rtfService.uploadEvidencia(rtfId, 0, 'ANEXO18_FIRMADO', info.file).subscribe({
        next: () => {
          this.subiendoAnexo18Firmado.set(false);
          this.toast.success('Anexo 18 firmado adjuntado', 'La copia firmada se registró correctamente.');
          this.rtfService.loadRtfCompleto(rtfId).subscribe();
        },
        error: (err) => {
          this.subiendoAnexo18Firmado.set(false);
          this.toast.error('Error', err.error?.mensaje || 'No se pudo adjuntar el Anexo 18 firmado.');
        }
      })
    );
  }

  // --- Control de Plazos - Cartas de Notificación/Notarial (Fase 4) ---

  onTipoCartaChange(tipo: string) {
    this.nuevaCartaTipo.set(tipo === 'CARTA_NOTARIAL' ? 'CARTA_NOTARIAL' : 'PRIMERA_NOTIFICACION');
    this.nuevaCartaDias.set(tipo === 'CARTA_NOTARIAL' ? 30 : 15);
  }

  onCartaFile(info: FileInfo) {
    this.nuevaCartaArchivo.set(info.file);
  }

  // --- Marcar convenio como resuelto (ADR-018 Fase H) ---
  // Acción manual del especialista sobre un RTF en BLOQUEO_DEFINITIVO -- el sistema nunca lo
  // dispara solo (decisión explícita del usuario, ver ADR-018 punto 6 de "Decisión"). Confirmación
  // modal por ser una acción legal irreversible; el resultado (éxito o error) siempre se confirma
  // con un toast, nunca en silencio.
  showConfirmarResueltoModal = signal(false);

  toggleConfirmarResueltoModal() {
    this.showConfirmarResueltoModal.update(v => !v);
  }

  marcarConvenioResuelto() {
    const rtfId = this.rtfService.unSelectedRtfId();
    this.showConfirmarResueltoModal.set(false);
    if (!rtfId) return;

    this.accionEjecutandose.set(true);
    this.subs.add(
      this.rtfService.marcarConvenioResuelto(rtfId).subscribe({
        next: () => {
          this.accionEjecutandose.set(false);
          this.toast.success(
            'Convenio marcado como resuelto',
            'Se registró la Resolución del Convenio en el sistema de gestión de postulantes.'
          );
          this.volverBandeja();
        },
        error: (err) => {
          this.accionEjecutandose.set(false);
          this.toast.error('Error', err.error?.mensaje || 'No se pudo marcar el convenio como resuelto.');
        }
      })
    );
  }

  registrarCartaSubmit() {
    const rtfId = this.rtfService.unSelectedRtfId();
    const archivo = this.nuevaCartaArchivo();
    if (!rtfId || !archivo || !this.nuevaCartaFormValida()) return;

    this.registrandoCarta.set(true);
    this.subs.add(
      this.rtfService.registrarCarta(
        rtfId,
        this.nuevaCartaTipo(),
        this.nuevaCartaNumDocumento(),
        this.nuevaCartaFecNotificacion(),
        this.nuevaCartaDias(),
        archivo
      ).subscribe({
        next: () => {
          this.registrandoCarta.set(false);
          this.toast.success('Carta registrada', 'La carta fue registrada y notificada a la OA.');
          this.seleccionarRtf(rtfId);
        },
        error: (err) => {
          this.registrandoCarta.set(false);
          this.toast.error('Error', err.error?.mensaje || 'No se pudo registrar la carta.');
        }
      })
    );
  }

  sincronizarGastosF1() {
    const rtfId = this.rtfService.unSelectedRtfId();
    if (!rtfId) return;
    this.sincronizandoGastosF1.set(true);
    this.subs.add(
      this.rtfService.sincronizarGastosF1UN(rtfId).subscribe({
        next: () => {
          this.sincronizandoGastosF1.set(false);
          this.toast.success('Gastos F1 sincronizados', 'Se actualizó el detalle desde KOFIX.');
        },
        error: () => {
          this.sincronizandoGastosF1.set(false);
          this.toast.error('No se pudo sincronizar', 'Intenta nuevamente en unos minutos.');
        }
      })
    );
  }

  descargarCarta(carta: CartaDto) {
    const rtfId = this.rtfService.unSelectedRtfId();
    if (!rtfId || !carta.ideCarta) return;
    this.openPdfViewer(`${carta.tipCarta}_${carta.numDocumento}.pdf`, this.rtfService.descargarCarta(rtfId, carta.ideCarta));
  }

  generarAnexo18() {
    const rtfId = this.rtfService.unSelectedRtfId();
    if (!rtfId) return;
    this.openPdfViewer(
      `Anexo18_RTF_${rtfId}.pdf`,
      this.http.get(`${environment.apiUrl}/rtfs/${rtfId}/documentos/anexo18`, { responseType: 'blob' })
    );
  }

  aprobar() {
    const rtfId = this.rtfService.unSelectedRtfId();
    if (!rtfId) return;
    this.accionEjecutandose.set(true);

    this.subs.add(
      this.rtfService.aprobarUn(rtfId).subscribe({
        next: () => {
          this.toast.success('RTF aprobado exitosamente');
          this.accionEjecutandose.set(false);
          this.volverBandeja();
        },
        error: (err) => {
          this.toast.error(err.error?.mensaje || 'Error al aprobar RTF');
          this.accionEjecutandose.set(false);
        }
      })
    );
  }

  rechazar() {
    const rtfId = this.rtfService.unSelectedRtfId();
    if (!rtfId) return;
    this.accionEjecutandose.set(true);

    this.subs.add(
      this.rtfService.rechazarUn(rtfId).subscribe({
        next: () => {
          this.toast.success('RTF rechazado');
          this.accionEjecutandose.set(false);
          this.volverBandeja();
        },
        error: (err) => {
          this.toast.error(err.error?.mensaje || 'Error al rechazar RTF');
          this.accionEjecutandose.set(false);
        }
      })
    );
  }

  devolverRtf() {
    const rtfId = this.rtfService.unSelectedRtfId();
    if (!rtfId || !this.devolverObservacion().trim()) return;
    this.accionEjecutandose.set(true);

    this.subs.add(
      this.rtfService.devolverUn(rtfId, this.devolverObservacion()).subscribe({
        next: () => {
          this.toast.success('RTF devuelto a OA para corrección');
          this.accionEjecutandose.set(false);
          this.volverBandeja();
        },
        error: (err) => {
          this.toast.error(err.error?.mensaje || 'Error al devolver RTF');
          this.accionEjecutandose.set(false);
        }
      })
    );
  }
}

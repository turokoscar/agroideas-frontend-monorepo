import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RtfService, EvidenceDto, CartaDto } from '../../core/services/rtf.service';
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
} from '@agroideas/ui';
import { Observable, Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';

interface Anexo18FormValue {
  txtNumeroInforme: string;
  txtRepresentanteUn: string;
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

  // Filtros de la bandeja (ADR-013): se resuelven en el cliente — texto, estado y fecha
  // límite ya están completos en memoria (unRtfList + conveniosInfo), sin volver al backend.
  readonly estadosBandeja = [
    'EN_REVISION', 'AUDITADO_CAMPO', 'IN_REVISION_UN',
    'VENCIDO', 'PLAZO_INICIAL_NOTIFICACION', 'PLAZO_LIMITE_NOTARIAL',
  ] as const;

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

    return this.unRtfList().filter(rtf => {
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
  });

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
    txtConclusiones: '',
    txtRecomendaciones: '',
    estCalificacion: '',
  });
  guardandoAnexo18 = signal(false);

  // Control de Plazos - Cartas de Notificación/Notarial (Fase 4)
  cartas = this.rtfService.unCartas;
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

  // Control de Plazos (Fase 4): RTF vencido, con Carta de Notificación o Carta Notarial en curso.
  enControlDePlazo = computed(() =>
    ['VENCIDO', 'PLAZO_INICIAL_NOTIFICACION', 'PLAZO_LIMITE_NOTARIAL'].includes(this.rtfStatus())
  );

  private static readonly ESTADO_LABELS: Record<string, string> = {
    'EN_REVISION': 'En Revisión',
    'AUDITADO_CAMPO': 'Verificación de Campo Registrada',
    'IN_REVISION_UN': 'En Evaluación de Gabinete',
    'APROBADO': 'Aprobado',
    'RECHAZADO': 'Rechazado',
    'OBSERVADO': 'Observado',
    'VENCIDO': 'Plazo Vencido',
    'PLAZO_INICIAL_NOTIFICACION': 'Carta de Notificación Enviada',
    'PLAZO_LIMITE_NOTARIAL': 'Carta Notarial - Plazo Final',
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

  fecLimiteCarta = computed<Date | null>(() => {
    const carta = this.ultimaCarta();
    if (!carta) return null;
    const fecha = new Date(carta.fecNotificacion);
    fecha.setDate(fecha.getDate() + carta.canDiasOtorgados);
    return fecha;
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

  anexo18Empty = computed(() => !this.anexo18());

  anexo18FormValido = computed(() => {
    const f = this.anexo18Form();
    return !!f.txtNumeroInforme.trim() && !!f.txtRepresentanteUn.trim();
  });

  ngOnInit() {
    this.cargarBandeja();
    this.cargarConveniosInfo();
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
      case 'PLAZO_LIMITE_NOTARIAL': return 'Rechazado';
      case 'PLAZO_INICIAL_NOTIFICACION': return 'Pendiente';
      default: return 'Pendiente';
    }
  }

  private cargarBandeja() {
    this.loadingBandeja.set(true);
    this.subs.add(
      this.rtfService.loadBandejaUn().subscribe({
        next: () => this.loadingBandeja.set(false),
        error: () => { this.loadingBandeja.set(false); this.toast.error('Error', 'No se pudo cargar la bandeja.'); }
      })
    );
  }

  private cargarConveniosInfo() {
    this.subs.add(
      this.convenioGeneralService.obtenerAsignados().subscribe(mapa => this.conveniosInfo.set(mapa))
    );
  }

  seleccionarRtf(rtfId: number) {
    this.rtfService.unSelectedRtfId.set(rtfId);
    this.loadingCompleto.set(true);
    this.viewState.set('audit');
    this.showDevolverForm.set(false);
    this.showDevolverTempranoForm.set(false);
    this.devolverObservacion.set('');
    this.anexo18Form.set({
      txtNumeroInforme: '',
      txtRepresentanteUn: '',
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

  private cargarAnexo18(rtfId: number) {
    this.subs.add(
      this.rtfService.cargarAnexo18(rtfId).subscribe({
        next: (informe) => {
          if (informe) {
            this.anexo18Form.set({
              txtNumeroInforme: informe.txtNumeroInforme ?? '',
              txtRepresentanteUn: informe.txtRepresentanteUn ?? '',
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
   * Devuelve a la OA desde EN_REVISION/AUDITADO_CAMPO, antes de llegar a IN_REVISION_UN.
   * ADR-012: ya no hay evaluación por fila que guardar antes de devolver (ver nota en
   * `estaEnEvaluacionPrevia` más arriba) — se devuelve directo con observación vacía.
   */
  devolverTemprano() {
    const rtfId = this.rtfService.unSelectedRtfId();
    if (!rtfId) return;

    this.accionEjecutandose.set(true);
    this.subs.add(
      this.rtfService.devolverTemprano(rtfId, '').subscribe({
        next: () => {
          this.accionEjecutandose.set(false);
          this.toast.warning('Devuelto a la OA', 'RTF devuelto como Observado.');
          this.volverBandeja();
        },
        error: () => { this.accionEjecutandose.set(false); this.toast.error('Error', 'No se pudo devolver el RTF.'); }
      })
    );
  }

  /**
   * Continúa la evaluación desde EN_REVISION/AUDITADO_CAMPO hacia IN_REVISION_UN.
   * ADR-012: ya no hay evaluación por fila que guardar antes de continuar (ver nota en
   * `estaEnEvaluacionPrevia` más arriba).
   */
  continuarEvaluacion() {
    const rtfId = this.rtfService.unSelectedRtfId();
    if (!rtfId) return;

    this.accionEjecutandose.set(true);
    this.subs.add(
      this.rtfService.derivarUn(rtfId).subscribe({
        next: () => {
          this.accionEjecutandose.set(false);
          this.toast.success('Evaluación continuada', 'El expediente pasó a evaluación final.');
          this.seleccionarRtf(rtfId);
        },
        error: () => { this.accionEjecutandose.set(false); this.toast.error('Error', 'No se pudo continuar la evaluación.'); }
      })
    );
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

  // --- Control de Plazos - Cartas de Notificación/Notarial (Fase 4) ---

  onTipoCartaChange(tipo: string) {
    this.nuevaCartaTipo.set(tipo === 'CARTA_NOTARIAL' ? 'CARTA_NOTARIAL' : 'PRIMERA_NOTIFICACION');
    this.nuevaCartaDias.set(tipo === 'CARTA_NOTARIAL' ? 30 : 15);
  }

  onCartaFile(info: FileInfo) {
    this.nuevaCartaArchivo.set(info.file);
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

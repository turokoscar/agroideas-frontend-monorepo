import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe, PercentPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { RtfService, RtfCabeceraDto } from '../../core/services/rtf.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService, UiCountdownBannerComponent, UiPdfViewerComponent, UiDataTableComponent, UIModalComponent, TableColumn } from '@agroideas/ui';
import { TIPOS_INFORME, TIPOS_SUSTENTO, TIPO_OTROS, esDocumentoAnexo, etiquetaTipoDocumento } from '../../core/models/tipo-documento-anexo.model';

@Component({
  selector: 'app-oa-registro',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DecimalPipe, PercentPipe, UiCountdownBannerComponent, UiPdfViewerComponent, UiDataTableComponent, UIModalComponent],
  providers: [DecimalPipe],
  templateUrl: './oa-registro.component.html'
})
export class OaRegistroComponent implements OnInit {
  rtfService = inject(RtfService);
  authService = inject(AuthService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  useBdSelMetas = signal(false);
  sincronizandoGastosF1 = signal(false);

  sincronizarGastosF1() {
    const rtfId = this.rtfService.rtfId();
    if (!rtfId) return;
    this.sincronizandoGastosF1.set(true);
    this.rtfService.sincronizarGastosF1(rtfId).subscribe({
      next: () => {
        this.sincronizandoGastosF1.set(false);
        this.toast.success('Gastos F1 sincronizados', 'Se actualizó el detalle desde KOFIX.');
      },
      error: () => {
        this.sincronizandoGastosF1.set(false);
        this.toast.error('No se pudo sincronizar', 'Intenta nuevamente en unos minutos.');
      }
    });
  }

  /**
   * Mismo conjunto que EstadoRtf.EditablesPorOa en el backend (SIGEC_RTF.Entidad/Rtf/EstadoRtf.cs):
   * fuera de estos estados el RTF está en revisión de AGROIDEAS o ya fue evaluado, y el backend
   * rechaza cualquier escritura (MaquinaEstadosRtf.ValidarEditablePorOa). Se duplica aquí porque
   * es otro repo/otro lenguaje; solo controla la UI (modo lectura), el backend sigue siendo la
   * fuente de verdad.
   */
  isEditable = computed(() =>
    ['PENDIENTE', 'EN_EDICION', 'OBSERVADO', 'PLAZO_INICIAL_NOTIFICACION', 'PLAZO_LIMITE_NOTARIAL'].includes(this.rtfService.rtfStatus())
  );

  /**
   * ADR-012 de sigec-api-rtf/docs: sin filtro, `loadEstadoPlazo` trae el plazo activo más
   * reciente -- será de subsanación (10 días) en vez de presentación (15 días) en cuanto la UN
   * devuelva el RTF con observaciones, así que el rótulo del banner debe reflejarlo.
   */
  plazoBannerLabel = computed(() =>
    this.rtfService.rtfDeadlineTipo() === 'SUBSANACION_OBSERVACION'
      ? 'Plazo para subsanar observaciones'
      : 'Plazo para envío del RTF'
  );

  /**
   * ADR-014 (frontend) Fase 4/5: cuántas observaciones de la UN siguen sin atender en este RTF.
   * Antes de la Fase 5 (backend de ADR-016) contaba todo `OBSERVADO` sin distinguir atendidas --
   * ahora que `estAtencion` existe, solo cuenta las que de verdad bloquean el reenvío.
   */
  observacionesPendientes = signal(0);

  private cargarObservacionesPendientes(rtfId: number) {
    this.rtfService.obtenerEvaluacionUr(rtfId).subscribe({
      next: estado => {
        const count = (estado?.revisiones ?? []).filter(r => r.estConformidad === 'OBSERVADO' && r.estAtencion !== 'ATENDIDA').length;
        this.observacionesPendientes.set(count);
      },
      error: () => { /* silencioso: el banner simplemente no muestra conteo */ }
    });
  }

  filteredPasoCriticoMetas = computed(() => {
    return this.rtfService.pasoCriticoMetas().filter(meta => meta.metaFisicaProgramada > 0);
  });

  filteredLegacyMetas = computed(() => {
    return this.rtfService.metas().filter(meta => meta.canProgramada > 0);
  });

  // Column definitions for UiDataTableComponent
  metasSelColumns: TableColumn[] = [
    { field: 'descripcion', header: 'Actividad', align: 'left' },
    { field: 'unidadMedida', header: 'Unidad', align: 'left', width: '100px' },
    { field: 'metaFisicaProgramada', header: 'Física Prog.', align: 'right', type: 'number' },
    { field: 'metaFisicaEjecutada', header: 'Física Ejec.', align: 'right', type: 'custom' },
    { field: 'metaFisicaAvance', header: '%', align: 'right', type: 'custom' }
  ];

  metasLegacyColumns: TableColumn[] = [
    { field: 'actividad', header: 'Actividad', align: 'left' },
    { field: 'unidad', header: 'Unidad', align: 'left', width: '120px' },
    { field: 'canProgramada', header: 'Programado', align: 'right', type: 'number' },
    { field: 'canEjecutada', header: 'Ejecutado', align: 'right', type: 'custom' },
    { field: 'avancePct', header: '% Avance', align: 'right', type: 'custom' }
  ];

  indicadoresSelColumns: TableColumn[] = [
    { field: 'cadenaProductiva', header: 'Cadena', align: 'left' },
    { field: 'indicador', header: 'Indicador', align: 'left' },
    { field: 'unidadMedida', header: 'Unidad', align: 'left', width: '100px' },
    { field: 'lineaBase', header: 'Línea Base', align: 'right', type: 'number' },
    { field: 'metaProgramada', header: 'Programado', align: 'right', type: 'number' },
    { field: 'metaEjecutada', header: 'Ejecutado', align: 'right', type: 'custom' },
    { field: 'avancePct', header: '% Avance', align: 'right', type: 'custom' }
  ];

  indicadoresLegacyColumns: TableColumn[] = [
    { field: 'nombre', header: 'Indicador', align: 'left' },
    { field: 'unidad', header: 'Unidad', align: 'left', width: '120px' },
    { field: 'lineaBase', header: 'Línea Base', align: 'right', type: 'number' },
    { field: 'canProgramado', header: 'Programado', align: 'right', type: 'number' },
    { field: 'canEjecutado', header: 'Ejecutado', align: 'right', type: 'custom' },
    { field: 'avancePct', header: '% Avance', align: 'right', type: 'custom' }
  ];

  desembolsosColumns: TableColumn[] = [
    { field: 'item', header: 'Item / Actividad', align: 'left' },
    { field: 'amount', header: 'Monto', align: 'right', type: 'currency' },
    { field: 'date', header: 'Fecha', align: 'left', type: 'date' },
    { field: 'status', header: 'Estado', align: 'left', type: 'custom' }
  ];

  gastosColumns: TableColumn[] = [
    { field: 'txtItemNombre', header: 'Item', align: 'left' },
    { field: 'txtUnidadMedida', header: 'Unidad', align: 'left', width: '100px' },
    { field: 'canCantidad', header: 'Cantidad', align: 'right', type: 'number' },
    { field: 'numPrecioAdjudicado', header: 'P. Adjudicado', align: 'right', type: 'currency' },
    { field: 'numMontoRendido', header: 'Monto Rendido', align: 'right', type: 'currency' },
    { field: 'txtProveedorNombre', header: 'Proveedor', align: 'left' }
  ];

  ngOnInit() {
    const idpc = this.route.snapshot.paramMap.get('idpc');
    if (idpc) {
      this.useBdSelMetas.set(true);
      const pasoCriticoId = Number(idpc);
      this.rtfService.loadMetasPorPasoCritico(pasoCriticoId).subscribe();
      this.rtfService.loadIndicadoresPorPasoCritico(pasoCriticoId).subscribe();

      const cargarDatosDelRtf = (rtfId: number) => {
        this.rtfService.loadEvidencias(rtfId).subscribe();
        this.rtfService.loadGastosF1(rtfId).subscribe();
        this.rtfService.loadEstadoPlazo(rtfId).subscribe();
        this.cargarObservacionesPendientes(rtfId);
        // Recarga con ideRtf ya conocido para que se fusione el avance guardado localmente
        // (ADR-009), que la primera carga (línea de arriba, sin ideRtf) no pudo traer.
        this.rtfService.loadMetasPorPasoCritico(pasoCriticoId, rtfId).subscribe();
        this.rtfService.loadIndicadoresPorPasoCritico(pasoCriticoId, rtfId).subscribe();
      };

      // En caso de F5 / recarga, o si el rtfId en memoria no correspondía a este paso crítico,
      // recuperar postulanteId y cargar dashboard para resolver el rtfId correcto y rellenar los tiles.
      const resolverDesdeDashboard = () => {
        const usuarioId = Number(this.authService.user()?.id);
        if (!usuarioId) return;
        this.rtfService.resolvePostulanteId().subscribe({
          next: (postulanteId) => {
            if (!postulanteId) return;
            this.rtfService.loadDashboard(postulanteId).subscribe({
              next: (dashData) => {
                const pasos = dashData?.pasos || [];
                const pc = pasos.find((p: any) => p.id === pasoCriticoId);
                if (pc?.rtfId) {
                  this.rtfService.rtfId.set(pc.rtfId);
                  this.rtfService.loadDetalleRtf(pc.rtfId).subscribe();
                  cargarDatosDelRtf(pc.rtfId);
                } else {
                  // Ningún RTF existe todavía para este paso crítico: se limpia cualquier rtfId
                  // de otro paso que hubiera quedado en memoria para no reutilizarlo por error.
                  this.rtfService.rtfId.set(null);
                }
              }
            });
          }
        });
      };

      const rtfIdEnMemoria = this.rtfService.rtfId();
      if (rtfIdEnMemoria) {
        // `rtfId` es una señal global (RtfService/OaRtfService son singletons `providedIn: 'root'`)
        // que no se resetea al navegar entre pantallas — puede pertenecer a un paso crítico distinto
        // del de esta ruta (p. ej. al llegar desde el tile del dashboard tras haber abierto otro RTF
        // por la bandeja). Se valida contra `idePasoCritico` antes de confiar en él; si no coincide
        // (o el backend no pudo resolverlo aún), se descarta y se resuelve el rtfId correcto desde
        // el dashboard en vez de mezclar avance/evidencia de un paso crítico con otro.
        this.rtfService.loadDetalleRtf(rtfIdEnMemoria).subscribe({
          next: (data) => {
            if (data?.idePasoCritico === pasoCriticoId) {
              cargarDatosDelRtf(rtfIdEnMemoria);
            } else {
              resolverDesdeDashboard();
            }
          },
          error: () => resolverDesdeDashboard()
        });
      } else {
        resolverDesdeDashboard();
      }
    } else {
      // ADR-012: sin `idpc` en la ruta (caso ya raro: bandeja-oa ahora siempre lo incluye cuando
      // `idePasoCritico` está resuelto). El propio detalle del RTF trae `idePasoCritico`
      // autosanado por el backend (resolución perezosa), así que se usa ese valor para cargar
      // T1/R2 BD_SEL — no queda ninguna ruta legacy a la que recurrir.
      const rtfId = this.rtfService.rtfId();
      if (rtfId) {
        this.rtfService.loadDetalleRtf(rtfId).subscribe({
          next: (data) => {
            if (data?.idePasoCritico != null) {
              this.useBdSelMetas.set(true);
              this.rtfService.loadMetasPorPasoCritico(data.idePasoCritico, rtfId).subscribe();
              this.rtfService.loadIndicadoresPorPasoCritico(data.idePasoCritico, rtfId).subscribe();
            }
          }
        });
        this.rtfService.loadEvidencias(rtfId).subscribe();
        this.rtfService.loadGastosF1(rtfId).subscribe();
        this.rtfService.loadEstadoPlazo(rtfId).subscribe();
        this.cargarObservacionesPendientes(rtfId);
      }
    }
  }

  // Tab state
  activeTab = signal<'R1' | 'T1' | 'R2' | 'F1' | 'ANEXO17' | 'ANEXOS'>('R1');

  tabs = [
    { key: 'R1' as const, label: 'R1 - Información Cualitativa' },
    { key: 'T1' as const, label: 'T1 - Metas Físicas' },
    { key: 'R2' as const, label: 'R2 - Indicadores' },
    { key: 'F1' as const, label: 'F1 - Consolidado Financiero' },
    { key: 'ANEXOS' as const, label: 'Anexos' },
    { key: 'ANEXO17' as const, label: 'Anexo 17' }
  ];

  // Modal state
  modalOpen = signal(false);
  modalMode = signal<'meta' | 'indicador'>('meta');
  modalIndex = signal(0);

  editEjecutado = signal<number | null>(null);
  editMetaProgramada = signal<number>(0);
  editMetaFinancieraEjecutada = signal<number>(0);
  editComentario = signal('');

  pendingFiles = signal<{ name: string; size: number; file: File }[]>([]);

  // PDF viewer state
  pdfViewerOpen = signal(false);
  pdfViewerFilename = signal<string | null>(null);
  pdfViewerFileUrl = signal<string | null>(null);
  pdfViewerDownloadUrl = signal<string | null>(null);

  // Anexo 17 (vista previa/descarga + adjunto de la copia firmada)
  cargandoAnexo17 = signal(false);
  anexo17PendingFile = signal<{ name: string; size: number; file: File } | null>(null);
  subiendoAnexo17Firmado = signal(false);

  /** ideConcepto = 0, mismo convenio que ACTA_CAMPO (UnidadRegionalServicio.cs) para evidencia de RTF que no está ligada a una meta/indicador puntual. */
  anexo17FirmadosAdjuntos = computed(() =>
    this.rtfService.evidencias().filter(e => e.tipConcepto === 'ANEXO17_FIRMADO')
  );

  /** Solo informativo: el circuito de firma es físico/externo al sistema (decisión ya tomada,
   * ver ADR-014), así que esto nunca bloquea el envío -- únicamente recuerda el paso a la OA. */
  anexo17FirmadoPendiente = computed(() => this.isEditable() && this.anexo17FirmadosAdjuntos().length === 0);

  // Anexos (ADR-014 Parte 6, Fase 3): informes técnicos y documentos sustentatorios del Instructivo AGROIDEAS
  tiposInforme = TIPOS_INFORME;
  tiposSustento = TIPOS_SUSTENTO;
  tipoOtros = TIPO_OTROS;
  etiquetaTipoDocumento = etiquetaTipoDocumento;

  anexoTipoSeleccionado = signal<string>(TIPOS_INFORME[0].value);
  anexoEtiqueta = signal('');
  anexoPendingFile = signal<{ name: string; size: number; file: File } | null>(null);
  subiendoAnexo = signal(false);

  anexoEsOtros = computed(() => this.anexoTipoSeleccionado() === this.tipoOtros.value);

  /** Todo lo que no sea sustento de una meta/indicador puntual, el acta de campo (sube la UN) o la copia firmada del propio Anexo 17. */
  anexosSubidos = computed(() =>
    this.rtfService.evidencias().filter(e => esDocumentoAnexo(e.tipConcepto))
  );

  anexosInformes = computed(() =>
    this.anexosSubidos().filter(e => this.tiposInforme.some(t => t.value === e.tipConcepto))
  );
  anexosSustento = computed(() =>
    this.anexosSubidos().filter(e => this.tiposSustento.some(t => t.value === e.tipConcepto) || e.tipConcepto === this.tipoOtros.value)
  );

  /**
   * ADR-014 Parte 6 (Fase 4, reorientada): checklist puramente informativo -- nunca bloquea
   * "Enviar RTF". Solo cubre la familia Informes: los documentos sustentatorios (facturas/RH,
   * vouchers de contrapartida) ya llegan adjuntos por gasto vía la sincronización de Gastos F1
   * desde KOFIX (RtfGastoF1Dto.IdeArchivo), y la evidencia de cumplimiento de metas/indicadores
   * (fotografías, planillas) ya se adjunta por fila en los tabs T1/R2 -- un checklist de
   * "documentos sustentatorios" a nivel de RTF duplicaría mecanismos que ya existen y confundiría
   * más de lo que ayuda.
   */
  checklistInformes = computed(() =>
    this.tiposInforme.map(tipo => ({ tipo, cumple: this.anexosSubidos().some(e => e.tipConcepto === tipo.value) }))
  );

  onAnexoFileDrop(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer?.files) {
      this.processAnexoFile(event.dataTransfer.files);
    }
  }

  onAnexoFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.processAnexoFile(input.files);
      input.value = '';
    }
  }

  private processAnexoFile(files: FileList) {
    const f = files[0];
    if (!f) return;
    if (f.type !== 'application/pdf') {
      this.toast.error('Formato no permitido', 'Solo se admiten archivos PDF.');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      this.toast.error('Archivo muy grande', 'El archivo no debe superar los 10 MB.');
      return;
    }
    this.anexoPendingFile.set({ name: f.name, size: f.size, file: f });
  }

  removeAnexoPendingFile() {
    this.anexoPendingFile.set(null);
  }

  subirAnexo() {
    const rtfId = this.rtfService.rtfId();
    const pendiente = this.anexoPendingFile();
    if (!rtfId || !pendiente) return;
    if (this.anexoEsOtros() && !this.anexoEtiqueta().trim()) {
      this.toast.error('Falta el nombre del documento', 'Para "Otros" debes indicar cómo se llama el documento.');
      return;
    }

    this.subiendoAnexo.set(true);
    const tipo = this.anexoTipoSeleccionado();
    const etiqueta = this.anexoEtiqueta().trim() || undefined;
    this.rtfService.uploadEvidencia(rtfId, 0, tipo, pendiente.file, etiqueta).subscribe({
      next: () => {
        this.subiendoAnexo.set(false);
        this.anexoPendingFile.set(null);
        this.anexoEtiqueta.set('');
        this.toast.success('Anexo adjuntado', 'El documento se registró correctamente.');
      },
      error: err => {
        this.subiendoAnexo.set(false);
        this.toast.error('Error', `No se pudo adjuntar el documento: ${err.message}`);
      }
    });
  }

  // Action states
  isSaving = signal(false);
  isSubmitting = signal(false);

  // Computed
  canSubmit = computed(() => {
    if (!this.isEditable()) return false;
    // ADR-014 (frontend) Fase 5: gate de UI espejando ValidarAtencionCompleta en el backend
    // (ADR-016 sigec-api-rtf) -- el backend sigue siendo la fuente de verdad, esto solo evita
    // el viaje redondo de un 400 cuando ya se sabe de antemano que va a fallar.
    if (this.observacionesPendientes() > 0) return false;
    if (this.useBdSelMetas()) {
      const metasConAvance = this.rtfService.pasoCriticoMetas().filter(m => m.metaFisicaEjecutada != null).length;
      const indicadoresConAvance = this.rtfService.pasoCriticoIndicadores().filter(i => i.metaEjecutada != null).length;
      return metasConAvance > 0 || indicadoresConAvance > 0;
    }
    const metasConAvance = this.rtfService.metas().filter(m => m.canEjecutada != null).length;
    const indicadoresConAvance = this.rtfService.indicadores().filter(i => i.canEjecutado != null).length;
    return metasConAvance > 0 || indicadoresConAvance > 0;
  });

  activeModalItem = computed(() => {
    const idx = this.modalIndex();
    if (this.modalMode() === 'meta') {
      return this.useBdSelMetas()
        ? this.rtfService.pasoCriticoMetas()[idx]
        : this.rtfService.metas()[idx];
    } else {
      return this.useBdSelMetas()
        ? this.rtfService.pasoCriticoIndicadores()[idx]
        : this.rtfService.indicadores()[idx];
    }
  });

  asAny(val: any): any {
    return val;
  }

  modalTitle = computed(() => {
    if (this.modalMode() === 'meta') {
      if (this.useBdSelMetas()) {
        const meta = this.rtfService.pasoCriticoMetas()[this.modalIndex()];
        return (meta ? meta.descripcion : 'Meta Física') ?? '';
      }
      const meta = this.rtfService.metas()[this.modalIndex()];
      return (meta ? meta.actividad : 'Meta Física') ?? '';
    }
    if (this.useBdSelMetas()) {
      const ind = this.rtfService.pasoCriticoIndicadores()[this.modalIndex()];
      return (ind ? (ind.indicador ?? 'Indicador') : 'Indicador') ?? '';
    }
    const ind = this.rtfService.indicadores()[this.modalIndex()];
    return (ind ? ind.nombre : 'Indicador') ?? '';
  });

  modalUnidad = computed(() => {
    if (this.modalMode() === 'meta') {
      if (this.useBdSelMetas()) {
        return this.rtfService.pasoCriticoMetas()[this.modalIndex()]?.unidadMedida ?? '';
      }
      return this.rtfService.metas()[this.modalIndex()]?.unidad ?? '';
    }
    if (this.useBdSelMetas()) {
      return this.rtfService.pasoCriticoIndicadores()[this.modalIndex()]?.unidadMedida ?? '';
    }
    return this.rtfService.indicadores()[this.modalIndex()]?.unidad ?? '';
  });

  modalEvidencias = computed(() => {
    if (this.useBdSelMetas()) {
      // Mismo esquema que el flujo legacy (ideConcepto/tipConcepto) — SubirEvidenciaYActualizarMetaAsync/
      // ...Indicador en el backend registran la evidencia con IdeConcepto = meta.id / indicador.id.
      if (this.modalMode() === 'meta') {
        const meta = this.rtfService.pasoCriticoMetas()[this.modalIndex()];
        return this.rtfService.evidencias().filter(e => e.ideConcepto === meta?.id && e.tipConcepto === 'METAFISICA');
      }
      const ind = this.rtfService.pasoCriticoIndicadores()[this.modalIndex()];
      return this.rtfService.evidencias().filter(e => e.ideConcepto === ind?.id && e.tipConcepto === 'INDICADOR');
    }
    if (this.modalMode() === 'meta') {
      const meta = this.rtfService.metas()[this.modalIndex()];
      return this.rtfService.evidencias().filter(e => e.ideConcepto === meta?.ideMetaFisica && e.tipConcepto === 'METAFISICA');
    }
    const ind = this.rtfService.indicadores()[this.modalIndex()];
    return this.rtfService.evidencias().filter(e => e.ideConcepto === ind?.ideIndicadorAvance && e.tipConcepto === 'INDICADOR');
  });

  openModal(mode: 'meta' | 'indicador', row: any) {
    this.modalMode.set(mode);

    let index = 0;
    if (mode === 'meta') {
      if (this.useBdSelMetas()) {
        index = this.rtfService.pasoCriticoMetas().findIndex(m => m.id === row.id);
      } else {
        index = this.rtfService.metas().findIndex(m => m.ideMetaFisica === row.ideMetaFisica);
      }
    } else {
      if (this.useBdSelMetas()) {
        index = this.rtfService.pasoCriticoIndicadores().findIndex(i => i.id === row.id);
      } else {
        index = this.rtfService.indicadores().findIndex(i => i.ideIndicadorAvance === row.ideIndicadorAvance);
      }
    }

    this.modalIndex.set(index);

    if (mode === 'meta') {
      if (this.useBdSelMetas()) {
        const meta = this.rtfService.pasoCriticoMetas()[index];
        this.editEjecutado.set(meta.metaFisicaEjecutada);
        this.editMetaFinancieraEjecutada.set(meta.metaFinancieraEjecutada);
        this.editComentario.set(meta.comentarios ?? '');
      } else {
        const meta = this.rtfService.metas()[index];
        this.editEjecutado.set(meta.canEjecutada);
        this.editMetaFinancieraEjecutada.set(0);
        this.editComentario.set(meta.txtComentario ?? '');
      }
    } else if (this.useBdSelMetas()) {
      const ind = this.rtfService.pasoCriticoIndicadores()[index];
      this.editEjecutado.set(ind.metaEjecutada);
      this.editMetaProgramada.set(ind.metaProgramada);
      this.editMetaFinancieraEjecutada.set(0);
      this.editComentario.set(ind.comentarios ?? '');
    } else {
      const ind = this.rtfService.indicadores()[index];
      this.editEjecutado.set(ind.canEjecutado);
      this.editMetaProgramada.set(0);
      this.editMetaFinancieraEjecutada.set(0);
      this.editComentario.set(ind.txtComentario ?? '');
    }

    this.pendingFiles.set([]);
    this.modalOpen.set(true);
  }

  closeModal() {
    this.modalOpen.set(false);
    this.pendingFiles.set([]);
  }

  saveModalAvance() {
    if (!this.isEditable()) {
      this.toast.error('Reporte en revisión', 'El RTF no puede modificarse mientras está en revisión o ya fue evaluado por AGROIDEAS.');
      return;
    }
    const value = this.editEjecutado();
    if (value == null || value < 0) return;

    if (this.useBdSelMetas()) {
      // ADR-009: el avance ejecutado y la evidencia BD_SEL se guardan localmente, ligados al
      // RTF — hace falta que exista antes de guardar el avance.
      const rtfId = this.rtfService.rtfId();
      if (rtfId) {
        this.guardarAvanceModal(rtfId);
        return;
      }
      const payload = this.construirPayloadNuevoRtf({});
      if (!payload) {
        this.toast.error('Error', 'No se pudo determinar el convenio o el periodo del paso crítico activo.');
        return;
      }
      this.rtfService.registrarRtf(payload).subscribe({
        next: nuevoRtf => {
          if (nuevoRtf?.ideRtf) {
            this.rtfService.rtfId.set(nuevoRtf.ideRtf);
            this.guardarAvanceModal(nuevoRtf.ideRtf);
          } else {
            this.toast.error('Error', 'No se pudo crear el RTF.');
          }
        },
        error: () => this.toast.error('Error', 'No se pudo crear el RTF.')
      });
      return;
    }

    this.guardarAvanceModal(null);
  }

  /** rtfIdBdSel es obligatorio cuando useBdSelMetas() es true (ADR-009); ignorado en el flujo legacy. */
  private guardarAvanceModal(rtfIdBdSel: number | null) {
    const value = this.editEjecutado();
    if (value == null || value < 0) return;

    if (this.useBdSelMetas() && this.modalMode() === 'meta') {
      const meta = this.rtfService.pasoCriticoMetas()[this.modalIndex()];
      const financiera = this.editMetaFinancieraEjecutada();
      this.rtfService.actualizarEjecucionMeta(meta.id, rtfIdBdSel!, value, financiera, this.editComentario()).subscribe({
        next: () => {
          this.rtfService.pasoCriticoMetas.update(prev => prev.map((m, i) =>
            i === this.modalIndex() ? { ...m, metaFisicaEjecutada: value, metaFinancieraEjecutada: financiera, comentarios: this.editComentario() } : m
          ));
        },
        error: err => this.toast.error('Error', `No se pudo guardar el avance: ${err.message}`)
      });
    } else if (this.useBdSelMetas() && this.modalMode() === 'indicador') {
      const ind = this.rtfService.pasoCriticoIndicadores()[this.modalIndex()];
      const metaProgramada = this.editMetaProgramada();
      this.rtfService.actualizarEjecucionIndicador(ind.id, rtfIdBdSel!, metaProgramada, value, this.editComentario()).subscribe({
        next: () => {
          this.rtfService.pasoCriticoIndicadores.update(prev => prev.map((m, i) =>
            i === this.modalIndex() ? { ...m, metaProgramada, metaEjecutada: value, comentarios: this.editComentario() } : m
          ));
        },
        error: err => this.toast.error('Error', `No se pudo guardar el avance: ${err.message}`)
      });
    } else if (this.modalMode() === 'meta') {
      this.rtfService.updateMeta(this.modalIndex(), {
        canEjecutada: value,
        txtComentario: this.editComentario()
      });
    } else {
      this.rtfService.updateIndicador(this.modalIndex(), {
        canEjecutado: value,
        txtComentario: this.editComentario()
      });
    }

    // Upload pending files
    const files = this.pendingFiles();
    if (this.useBdSelMetas() && this.modalMode() === 'meta') {
      const meta = this.rtfService.pasoCriticoMetas()[this.modalIndex()];
      if (files.length > 0) {
        for (const f of files) {
          this.rtfService.subirEvidenciaMeta(meta.id, rtfIdBdSel!, f.file).subscribe({
            error: err => this.toast.error('Error', `No se pudo subir ${f.name}: ${err.message}`)
          });
        }
      }
    } else if (this.useBdSelMetas() && this.modalMode() === 'indicador') {
      const ind = this.rtfService.pasoCriticoIndicadores()[this.modalIndex()];
      if (files.length > 0) {
        for (const f of files) {
          this.rtfService.subirEvidenciaIndicador(ind.id, rtfIdBdSel!, f.file).subscribe({
            error: err => this.toast.error('Error', `No se pudo subir ${f.name}: ${err.message}`)
          });
        }
      }
    } else {
      const rtfId = this.rtfService.rtfId();
      const ideConcepto = this.modalMode() === 'meta'
        ? (this.rtfService.metas()[this.modalIndex()]?.ideMetaFisica ?? 0)
        : (this.rtfService.indicadores()[this.modalIndex()]?.ideIndicadorAvance ?? 0);
      const tipConcepto = this.modalMode() === 'meta' ? 'METAFISICA' : 'INDICADOR';
      if (rtfId && files.length > 0) {
        for (const f of files) {
          this.rtfService.uploadEvidencia(rtfId, ideConcepto, tipConcepto, f.file).subscribe({
            error: err => this.toast.error('Error', `No se pudo subir ${f.name}: ${err.message}`)
          });
        }
      }
    }

    this.toast.success('Avance registrado', `El avance para "${this.modalTitle()}" se ha guardado correctamente.`);
    this.closeModal();
  }

  onModalFileDrop(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer?.files) {
      this.processModalFiles(event.dataTransfer.files);
    }
  }

  onModalFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.processModalFiles(input.files);
      input.value = '';
    }
  }

  private processModalFiles(files: FileList) {
    Array.from(files).forEach(f => {
      if (f.type !== 'application/pdf') return;
      if (f.size > 10 * 1024 * 1024) return;
      this.pendingFiles.update(prev => [...prev, { name: f.name, size: f.size, file: f }]);
    });
  }

  removePendingFile(name: string) {
    this.pendingFiles.update(prev => prev.filter(f => f.name !== name));
  }

  removeEvidencia(evidenciaId: number) {
    this.rtfService.removeEvidencia(evidenciaId).subscribe();
  }

  viewPdf(evidenciaId: number, filename: string) {
    this.pdfViewerFilename.set(filename);
    this.pdfViewerOpen.set(true);
    this.rtfService.downloadEvidencia(evidenciaId).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        this.pdfViewerFileUrl.set(url);
        this.pdfViewerDownloadUrl.set(url);
      },
      error: () => {
        this.toast.error('Error', 'No se pudo cargar el PDF.');
        this.pdfViewerFileUrl.set(null);
        this.pdfViewerDownloadUrl.set(null);
      }
    });
  }

  onPdfViewerClose() {
    URL.revokeObjectURL(this.pdfViewerFileUrl() ?? '');
    this.pdfViewerOpen.set(false);
    this.pdfViewerFileUrl.set(null);
    this.pdfViewerDownloadUrl.set(null);
  }

  verAnexo17() {
    const rtfId = this.rtfService.rtfId();
    if (!rtfId) {
      this.toast.error('Guarda un borrador primero', 'Necesitas registrar al menos un avance antes de generar la vista previa del Anexo 17.');
      return;
    }
    this.pdfViewerFilename.set(`Anexo17_RTF_${rtfId}.pdf`);
    this.pdfViewerOpen.set(true);
    this.cargandoAnexo17.set(true);
    this.rtfService.descargarAnexo17(rtfId).subscribe({
      next: blob => {
        this.cargandoAnexo17.set(false);
        const url = URL.createObjectURL(blob);
        this.pdfViewerFileUrl.set(url);
        this.pdfViewerDownloadUrl.set(url);
      },
      error: () => {
        this.cargandoAnexo17.set(false);
        this.toast.error('Error', 'No se pudo generar la vista previa del Anexo 17.');
        this.pdfViewerFileUrl.set(null);
        this.pdfViewerDownloadUrl.set(null);
      }
    });
  }

  onAnexo17FileDrop(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer?.files) {
      this.processAnexo17File(event.dataTransfer.files);
    }
  }

  onAnexo17FileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.processAnexo17File(input.files);
      input.value = '';
    }
  }

  private processAnexo17File(files: FileList) {
    const f = files[0];
    if (!f) return;
    if (f.type !== 'application/pdf') {
      this.toast.error('Formato no permitido', 'Solo se admite el Anexo 17 firmado en formato PDF.');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      this.toast.error('Archivo muy grande', 'El PDF no debe superar los 10 MB.');
      return;
    }
    this.anexo17PendingFile.set({ name: f.name, size: f.size, file: f });
  }

  removeAnexo17PendingFile() {
    this.anexo17PendingFile.set(null);
  }

  subirAnexo17Firmado() {
    const rtfId = this.rtfService.rtfId();
    const pendiente = this.anexo17PendingFile();
    if (!rtfId || !pendiente) return;

    this.subiendoAnexo17Firmado.set(true);
    this.rtfService.uploadEvidencia(rtfId, 0, 'ANEXO17_FIRMADO', pendiente.file).subscribe({
      next: () => {
        this.subiendoAnexo17Firmado.set(false);
        this.anexo17PendingFile.set(null);
        this.toast.success('Anexo 17 firmado adjuntado', 'La copia firmada se registró correctamente.');
      },
      error: err => {
        this.subiendoAnexo17Firmado.set(false);
        this.toast.error('Error', `No se pudo adjuntar el Anexo 17 firmado: ${err.message}`);
      }
    });
  }

  /**
   * Convenio y periodo del RTF nuevo salen del paso crítico activo (cargado en `pasos()` vía
   * loadDashboard/loadPasosCriticos), no del paso crítico "activo" ficticio - antes se enviaban
   * hardcodeados (ideConvenio: 0, fechas vacías) y el backend rechazaba la creación con 400.
   */
  private construirPayloadNuevoRtf(r1Payload: Partial<RtfCabeceraDto>): Partial<RtfCabeceraDto> | null {
    const pasoActual = this.rtfService.pasos().find(p => p.id === this.rtfService.pasoCriticoId());
    const ideConvenio = this.rtfService.postulanteId();
    if (!pasoActual || !ideConvenio) {
      return null;
    }
    return {
      ideConvenio,
      numPasoCritico: this.rtfService.activePasoNumero(),
      fecInicioPeriodo: pasoActual.start.toISOString(),
      fecFinPeriodo: pasoActual.end.toISOString(),
      ...r1Payload
    };
  }

  guardarBorrador() {
    if (!this.isEditable()) {
      this.toast.error('Reporte en revisión', 'El RTF no puede modificarse mientras está en revisión o ya fue evaluado por AGROIDEAS.');
      return;
    }
    this.isSaving.set(true);
    let rtfId = this.rtfService.rtfId();
    const r1Payload = {
      txtActividadesRealizadas: this.rtfService.txtActividadesRealizadas(),
      txtActividadesNoRealizadas: this.rtfService.txtActividadesNoRealizadas(),
      txtLogros: this.rtfService.txtLogros(),
      txtDificultades: this.rtfService.txtDificultades(),
      txtCambiosPaso: this.rtfService.txtCambiosPaso()
    };
    // ADR-012: el avance de metas/indicadores BD_SEL ya se persiste fila a fila (modal de avance,
    // PasoCriticoService.actualizarEjecucionMeta/Indicador) — "Guardar Borrador" solo necesita
    // guardar R1 aquí. La ruta legacy (bulk updateMetas/updateIndicadores contra
    // rtfs/{id}/metas-fisicas) se retiró junto con las tablas que la respaldaban.
    const afterR1 = () => {
      this.isSaving.set(false);
      this.toast.success('Borrador guardado', 'El borrador del RTF se ha guardado correctamente.');
    };
    if (rtfId) {
      this.rtfService.updateRtf(rtfId, r1Payload).subscribe({
        next: () => afterR1(),
        error: () => { this.isSaving.set(false); this.toast.error('Error', 'No se pudo guardar el borrador.'); }
      });
    } else {
      const payload = this.construirPayloadNuevoRtf(r1Payload);
      if (!payload) {
        this.isSaving.set(false);
        this.toast.error('Error', 'No se pudo determinar el convenio o el periodo del paso crítico activo.');
        return;
      }
      this.rtfService.registrarRtf(payload).subscribe({
        next: (nuevoRtf) => {
          if (nuevoRtf?.ideRtf) {
            rtfId = nuevoRtf.ideRtf;
            this.rtfService.rtfId.set(nuevoRtf.ideRtf);
            afterR1();
          } else {
            this.isSaving.set(false);
            this.toast.error('Error', 'No se pudo crear el RTF.');
          }
        },
        error: () => { this.isSaving.set(false); this.toast.error('Error', 'No se pudo crear el RTF.'); }
      });
    }
  }

  enviarRtf() {
    if (this.observacionesPendientes() > 0) {
      this.toast.error('Observaciones pendientes', 'Debes responder todas las observaciones de AGROIDEAS en el Pliego de Observaciones antes de reenviar el RTF.');
      return;
    }
    if (!this.canSubmit()) return;
    this.isSubmitting.set(true);

    let rtfId = this.rtfService.rtfId();
    const r1Payload = {
      txtActividadesRealizadas: this.rtfService.txtActividadesRealizadas(),
      txtActividadesNoRealizadas: this.rtfService.txtActividadesNoRealizadas(),
      txtLogros: this.rtfService.txtLogros(),
      txtDificultades: this.rtfService.txtDificultades(),
      txtCambiosPaso: this.rtfService.txtCambiosPaso()
    };
    // ADR-012: igual que en guardarBorrador() — el avance BD_SEL ya está persistido fila a fila;
    // nada que hacer aquí salvo enviar.
    const afterR1 = () => {
      this.rtfService.enviarRtf(rtfId!).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.toast.success('RTF enviado', 'El Reporte Técnico Financiero se ha guardado correctamente.');
          this.router.navigate(['/rtf/dashboard']);
        },
        error: () => {
          this.isSubmitting.set(false);
          this.toast.error('Error al enviar', 'No se pudo enviar el RTF. Intente nuevamente.');
        }
      });
    };
    if (rtfId) {
      this.rtfService.updateRtf(rtfId, r1Payload).subscribe({
        next: () => afterR1(),
        error: () => { this.isSubmitting.set(false); this.toast.error('Error', 'No se pudo enviar el RTF.'); }
      });
    } else {
      const payload = this.construirPayloadNuevoRtf(r1Payload);
      if (!payload) {
        this.isSubmitting.set(false);
        this.toast.error('Error', 'No se pudo determinar el convenio o el periodo del paso crítico activo.');
        return;
      }
      this.rtfService.registrarRtf(payload).subscribe({
        next: (nuevoRtf) => {
          if (nuevoRtf?.ideRtf) {
            rtfId = nuevoRtf.ideRtf;
            this.rtfService.rtfId.set(nuevoRtf.ideRtf);
            afterR1();
          } else {
            this.isSubmitting.set(false);
            this.toast.error('Error', 'No se pudo crear el RTF.');
          }
        },
        error: () => { this.isSubmitting.set(false); this.toast.error('Error', 'No se pudo crear el RTF.'); }
      });
    }
  }

  sizeKB(size: number): number {
    return size > 0 ? Math.round(size / 1024) : 0;
  }
}

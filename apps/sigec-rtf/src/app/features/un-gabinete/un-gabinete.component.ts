import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RtfService, EvidenceDto, UrEvaluacionItemDto, CartaDto } from '../../core/services/rtf.service';
import { ToastService, UiCountdownBannerComponent, UiPdfViewerComponent } from '@agroideas/ui';
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
  imports: [CommonModule, DecimalPipe, DatePipe, UiCountdownBannerComponent, UiPdfViewerComponent],
  providers: [DecimalPipe, DatePipe],
  templateUrl: './un-gabinete.component.html',
})
export class UnGabineteComponent implements OnInit, OnDestroy {
  rtfService = inject(RtfService);
  private toast = inject(ToastService);
  private http = inject(HttpClient);
  private subs = new Subscription();

  // View state
  viewState = signal<'list' | 'audit'>('list');
  loadingBandeja = signal(false);
  loadingCompleto = signal(false);
  accionEjecutandose = signal(false);

  // UN signals (self-contained, ver un-gabinete.service.ts)
  unRtfList = this.rtfService.unRtfList;
  cabecera = this.rtfService.unCabeceraSeleccionada;
  metas = this.rtfService.unMetas;
  indicadores = this.rtfService.unIndicadores;
  evidencias = this.rtfService.unEvidencias;
  gastosF1 = this.rtfService.unGastosF1;
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

  // Verificación de campo (Anexo 19, opcional) — ver ADR-010
  rowEvalMap = signal<Partial<Record<number, { estConformidad: 'CONFORME' | 'OBSERVADO'; txtObservacion?: string }>>>({});
  actaSubida = signal(false);
  actaFileName = signal('');

  // Solo aplica antes de que el expediente llegue a IN_REVISION_UN.
  estaEnEvaluacionPrevia = computed(() => ['EN_REVISION', 'AUDITADO_CAMPO'].includes(this.rtfStatus()));

  // Control de Plazos (Fase 4): RTF vencido, con Carta de Notificación o Carta Notarial en curso.
  enControlDePlazo = computed(() =>
    ['VENCIDO', 'PLAZO_INICIAL_NOTIFICACION', 'PLAZO_LIMITE_NOTARIAL'].includes(this.rtfStatus())
  );

  rtfStatusLabel = computed(() => {
    const map: Record<string, string> = {
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
    return map[this.rtfStatus()] ?? this.rtfStatus();
  });

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

  // Evaluación por fila (T1/R2 locales) para la verificación de campo opcional.
  evaluationRows = computed(() => {
    const metas = this.metas().map(m => ({
      id: m.ideMetaFisica!,
      label: m.actividad || 'Meta',
      value: `${m.canEjecutada ?? '—'} / ${m.canProgramada} ${m.unidad ?? ''}`,
      kind: 'META' as const
    }));
    const indicadores = this.indicadores().map(i => ({
      id: i.ideIndicadorAvance!,
      label: i.nombre || 'Indicador',
      value: `${i.canEjecutado ?? '—'} ${i.unidad ?? ''}`,
      kind: 'INDICADOR' as const
    }));
    return [...metas, ...indicadores];
  });

  allMarked = computed(() => this.evaluationRows().every(r => this.rowEvalMap()[r.id]?.estConformidad != null));

  observedRows = computed(() =>
    this.evaluationRows().filter(r => this.rowEvalMap()[r.id]?.estConformidad === 'OBSERVADO')
  );

  observedMissingComment = computed(() =>
    this.observedRows().filter(r => !(this.rowEvalMap()[r.id]?.txtObservacion ?? '').trim())
  );

  /**
   * La verificación de campo (Anexo 19) es opcional (ADR-010) — un RTF con metas/indicadores
   * BD_SEL no tiene filas locales que marcar (`evaluationRows().length === 0`), así que se puede
   * continuar directo. Cuando sí hay filas locales (flujo legacy), deben quedar todas marcadas y
   * sin observaciones para continuar.
   */
  puedeContinuar = computed(() =>
    this.evaluationRows().length === 0 || (this.allMarked() && this.observedRows().length === 0)
  );
  puedeDevolverTemprano = computed(() =>
    this.evaluationRows().length === 0 || (this.observedRows().length > 0 && this.observedMissingComment().length === 0)
  );

  ngOnInit() {
    this.cargarBandeja();
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  getFecRegistro(rtf: any) {
    return rtf.fecRegistro ?? null;
  }

  estadoBadgeClass(estado?: string): string {
    switch (estado) {
      case 'IN_REVISION_UN': return 'border-primary/20 bg-primary/10 text-primary';
      case 'AUDITADO_CAMPO': return 'border-info/20 bg-info/10 text-info';
      case 'VENCIDO': return 'border-destructive/20 bg-destructive/10 text-destructive';
      case 'PLAZO_LIMITE_NOTARIAL': return 'border-destructive/20 bg-destructive/10 text-destructive';
      case 'PLAZO_INICIAL_NOTIFICACION': return 'border-warning/20 bg-warning/10 text-warning';
      default: return 'border-warning/20 bg-warning/10 text-warning';
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
    this.rowEvalMap.set({});
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

  onActaDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file) this.uploadActa(file);
  }

  onActaSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.uploadActa(file);
    input.value = '';
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

  setEvaluacion(rowId: number, est: 'CONFORME' | 'OBSERVADO') {
    this.rowEvalMap.update(map => {
      const current = map[rowId];
      if (current?.estConformidad === est) {
        const rest = { ...map }; delete rest[rowId];
        return rest;
      }
      return { ...map, [rowId]: { estConformidad: est, txtObservacion: current?.txtObservacion || '' } };
    });
  }

  setObservacion(rowId: number, comment: string) {
    this.rowEvalMap.update(map => {
      const current = map[rowId];
      if (!current) return map;
      return { ...map, [rowId]: { ...current, txtObservacion: comment } };
    });
  }

  rowNeedsComment(rowId: number): boolean {
    const rv = this.rowEvalMap()[rowId];
    return rv?.estConformidad === 'OBSERVADO' && !(rv?.txtObservacion ?? '').trim().length;
  }

  evaluationRowClasses(rowId: number): Record<string, boolean> {
    const needsComment = this.rowNeedsComment(rowId);
    return {
      'border-destructive/50': needsComment,
      'bg-destructive/5': needsComment,
      'border-border': !needsComment,
      'bg-surface-container/20': !needsComment
    };
  }

  toggleDevolverTempranoForm() {
    this.showDevolverTempranoForm.update(v => !v);
  }

  /** Devuelve a la OA desde EN_REVISION/AUDITADO_CAMPO, antes de llegar a IN_REVISION_UN. */
  devolverTemprano() {
    const rtfId = this.rtfService.unSelectedRtfId();
    if (!rtfId || !this.puedeDevolverTemprano()) return;

    const obs = this.observedRows()
      .map(r => `• ${r.label}: ${this.rowEvalMap()[r.id]?.txtObservacion ?? ''}`)
      .join('\n');

    const items: UrEvaluacionItemDto[] = this.evaluationRows().map(r => ({
      id: r.id,
      kind: r.kind,
      estConformidad: this.rowEvalMap()[r.id]?.estConformidad || 'CONFORME',
      txtObservacion: this.rowEvalMap()[r.id]?.txtObservacion
    }));

    this.accionEjecutandose.set(true);
    const continuar = () => {
      this.subs.add(
        this.rtfService.devolverTemprano(rtfId, obs).subscribe({
          next: () => {
            this.accionEjecutandose.set(false);
            this.toast.warning('Devuelto a la OA', 'RTF devuelto como Observado.');
            this.volverBandeja();
          },
          error: () => { this.accionEjecutandose.set(false); this.toast.error('Error', 'No se pudo devolver el RTF.'); }
        })
      );
    };

    if (items.length > 0) {
      this.subs.add(
        this.rtfService.guardarEvaluacionUr(rtfId, items).subscribe({
          next: continuar,
          error: () => { this.accionEjecutandose.set(false); this.toast.error('Error', 'No se pudo guardar la evaluación.'); }
        })
      );
    } else {
      continuar();
    }
  }

  /** Continúa la evaluación desde EN_REVISION/AUDITADO_CAMPO hacia IN_REVISION_UN. */
  continuarEvaluacion() {
    const rtfId = this.rtfService.unSelectedRtfId();
    if (!rtfId || !this.puedeContinuar()) return;

    const items: UrEvaluacionItemDto[] = this.evaluationRows().map(r => ({
      id: r.id,
      kind: r.kind,
      estConformidad: 'CONFORME'
    }));

    this.accionEjecutandose.set(true);
    const continuar = () => {
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
    };

    if (items.length > 0) {
      this.subs.add(
        this.rtfService.guardarEvaluacionUr(rtfId, items).subscribe({
          next: continuar,
          error: () => { this.accionEjecutandose.set(false); this.toast.error('Error', 'No se pudo guardar la evaluación.'); }
        })
      );
    } else {
      continuar();
    }
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

  onCartaDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file) this.nuevaCartaArchivo.set(file);
  }

  onCartaSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.nuevaCartaArchivo.set(file);
    input.value = '';
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

import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RtfService, EvidenceDto, UrEvaluacionItemDto } from '../../core/services/rtf.service';
import { ToastService } from '@agroideas/ui';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';

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
  imports: [CommonModule, DecimalPipe, DatePipe],
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
  anexo18 = signal<any>(null);

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

  rtfStatusLabel = computed(() => {
    const map: Record<string, string> = {
      'EN_REVISION': 'En Revisión',
      'AUDITADO_CAMPO': 'Verificación de Campo Registrada',
      'IN_REVISION_UN': 'En Evaluación de Gabinete',
      'APROBADO': 'Aprobado',
      'RECHAZADO': 'Rechazado',
      'OBSERVADO': 'Observado',
    };
    return map[this.rtfStatus()] ?? this.rtfStatus();
  });

  // R1 items para la vista
  r1Items = computed(() => [
    { label: 'Actividades Realizadas', value: this.cabecera()?.txtActividadesRealizadas },
    { label: 'Actividades No Realizadas', value: this.cabecera()?.txtActividadesNoRealizadas },
    { label: 'Logros', value: this.cabecera()?.txtLogros },
    { label: 'Dificultades', value: this.cabecera()?.txtDificultades },
    { label: 'Cambios en el Paso', value: this.cabecera()?.txtCambiosPaso },
  ]);

  anexo18Empty = computed(() => {
    const a = this.anexo18();
    return !a || Object.keys(a).length === 0;
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
    this.anexo18.set(null);
    this.rowEvalMap.set({});
    this.actaSubida.set(false);
    this.actaFileName.set('');

    this.subs.add(
      this.rtfService.loadRtfCompleto(rtfId).subscribe({
        next: (data) => {
          this.loadingCompleto.set(false);
          if (data?.cabecera.estRtf === 'AUDITADO_CAMPO') {
            this.actaSubida.set(true);
            this.actaFileName.set('Acta de Campo registrada');
          }
          this.cargarAnexo18(rtfId);
        },
        error: () => {
          this.loadingCompleto.set(false);
          this.toast.error('Error al cargar el RTF completo');
        }
      })
    );
  }

  private cargarAnexo18(rtfId: number) {
    this.subs.add(
      this.http.get<any>(`${environment.apiUrl}/rtfs/${rtfId}/informe-comprobacion`).subscribe({
        next: (res: any) => {
          if (res?.datos) {
            this.anexo18.set(res.datos);
          }
        },
        error: () => {}
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
        const { [rowId]: _, ...rest } = map;
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

  descargarEvidencia(ev: EvidenceDto) {
    if (!ev.ideEvidencia) return;
    this.subs.add(
      this.rtfService.downloadEvidencia(ev.ideEvidencia).subscribe({
        next: (blob: Blob) => {
          const url = URL.createObjectURL(blob);
          const a = window.document.createElement('a');
          a.href = url;
          a.download = ev.txtNombreArchivo || `evidencia_${ev.ideEvidencia}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
        },
        error: () => this.toast.error('Error', 'No se pudo descargar la evidencia.')
      })
    );
  }

  generarAnexo18() {
    const rtfId = this.rtfService.unSelectedRtfId();
    if (!rtfId) return;
    this.subs.add(
      this.http.get(`${environment.apiUrl}/rtfs/${rtfId}/documentos/anexo18`, { responseType: 'blob' }).subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const a = window.document.createElement('a');
          a.href = url;
          a.download = `Anexo18_RTF_${rtfId}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
        },
        error: () => this.toast.error('Error', 'No se pudo generar el Anexo 18')
      })
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

import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { RtfService, EvidenceDto, UrEvaluacionItemDto } from '../../core/services/rtf.service';
import { ToastService } from '@agroideas/ui';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-ur-auditoria',
  standalone: true,
  imports: [CommonModule, DecimalPipe, DatePipe],
  providers: [DecimalPipe, DatePipe],
  templateUrl: './ur-auditoria.component.html',
})
export class UrAuditoriaComponent implements OnInit, OnDestroy {
  rtfService = inject(RtfService);
  private toast = inject(ToastService);
  private subs: Subscription[] = [];

  viewState = signal<'list' | 'audit'>('list');
  loading = signal(false);

  // Evaluation map: rowId -> { estConformidad, txtObservacion }
  rowEvalMap = signal<Partial<Record<number, { estConformidad: 'CONFORME' | 'OBSERVADO'; txtObservacion?: string }>>>({});

  actaSubida = signal(false);
  actaFileName = signal('');

  // Computed
  evaluationRows = computed(() => {
    const metas = this.rtfService.metas().map(m => ({
      id: m.ideMetaFisica!,
      label: m.actividad || 'Meta',
      value: `${m.canEjecutada ?? '—'} / ${m.canProgramada} ${m.unidad ?? ''}`,
      kind: 'META' as const
    }));
    const indicadores = this.rtfService.indicadores().map(i => ({
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

  canDerive = computed(() => this.actaSubida() && this.allMarked() && this.observedRows().length === 0);
  canReturn = computed(() => this.actaSubida() && this.observedRows().length > 0 && this.observedMissingComment().length === 0);

  ngOnInit() {
    this.cargarBandeja();
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  cargarBandeja() {
    this.loading.set(true);
    this.subs.push(
      this.rtfService.loadBandejaUr().subscribe({
        next: () => this.loading.set(false),
        error: () => { this.loading.set(false); this.toast.error('Error', 'No se pudo cargar la bandeja UR.'); }
      })
    );
  }

  volverBandeja() {
    this.viewState.set('list');
    this.rtfService.rtfId.set(null);
    this.rowEvalMap.set({});
    this.actaSubida.set(false);
    this.actaFileName.set('');
    this.cargarBandeja();
  }

  seleccionarRtf(rtfId: number) {
    this.loading.set(true);
    this.viewState.set('audit');
    this.rtfService.urSelectedRtfId.set(rtfId);
    this.subs.push(
      this.rtfService.loadRtfCompleto(rtfId).subscribe({
        next: (data) => {
          this.loading.set(false);
          if (data?.cabecera.estRtf === 'AUDITADO_CAMPO') {
            this.actaSubida.set(true);
            this.actaFileName.set('Acta de Campo registrada');
          }
        },
        error: () => { this.loading.set(false); this.toast.error('Error', 'No se pudo cargar el RTF.'); }
      })
    );
  }

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
    const rtfId = this.rtfService.rtfId();
    if (!rtfId) return;

    this.subs.push(
      this.rtfService.uploadActaCampo(rtfId, file).subscribe({
        next: () => {
          this.actaSubida.set(true);
          this.actaFileName.set(file.name);
          this.toast.success('Anexo 19 registrado', 'Auditado en Campo.');
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

  descargarEvidencia(ev: EvidenceDto) {
    this.subs.push(
      this.rtfService.downloadEvidencia(ev.ideEvidencia).subscribe({
        next: blob => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = ev.txtNombreArchivo || 'documento.pdf';
          a.click();
          URL.revokeObjectURL(url);
        },
        error: () => this.toast.error('Error', 'No se pudo descargar la evidencia.')
      })
    );
  }

  devolverOA() {
    const rtfId = this.rtfService.rtfId();
    if (!rtfId || !this.canReturn()) return;

    const obs = this.observedRows()
      .map(r => `• ${r.label}: ${this.rowEvalMap()[r.id]?.txtObservacion ?? ''}`)
      .join('\n');

    // Save evaluation first, then devolver
    const items: UrEvaluacionItemDto[] = this.evaluationRows().map(r => ({
      id: r.id,
      kind: r.kind,
      estConformidad: this.rowEvalMap()[r.id]?.estConformidad || 'CONFORME',
      txtObservacion: this.rowEvalMap()[r.id]?.txtObservacion
    }));

    this.subs.push(
      this.rtfService.guardarEvaluacionUr(rtfId, items).subscribe({
        next: () => {
          this.rtfService.devolverRtf(rtfId, obs).subscribe({
            next: () => {
              this.toast.warning('Devuelto a la OA', 'RTF devuelto como Observado en Región.');
              this.volverBandeja();
            },
            error: () => this.toast.error('Error', 'No se pudo devolver el RTF.')
          });
        },
        error: () => this.toast.error('Error', 'No se pudo guardar la evaluación.')
      })
    );
  }

  derivarUN() {
    const rtfId = this.rtfService.rtfId();
    if (!rtfId || !this.canDerive()) return;

    const items: UrEvaluacionItemDto[] = this.evaluationRows().map(r => ({
      id: r.id,
      kind: r.kind,
      estConformidad: 'CONFORME'
    }));

    this.subs.push(
      this.rtfService.guardarEvaluacionUr(rtfId, items).subscribe({
        next: () => {
          this.rtfService.derivarUn(rtfId).subscribe({
            next: () => {
              this.toast.success('Derivado a UN Central', 'RTF derivado con conformidad.');
              this.volverBandeja();
            },
            error: () => this.toast.error('Error', 'No se pudo derivar a UN.')
          });
        },
        error: () => this.toast.error('Error', 'No se pudo guardar la evaluación.')
      })
    );
  }
}

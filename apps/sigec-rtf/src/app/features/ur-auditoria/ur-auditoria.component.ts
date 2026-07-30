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
  template: `
    <div class="space-y-6 animate-fade-in">

      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold tracking-tight text-foreground">
            {{ viewState() === 'list' ? 'Auditoría Regional' : 'Auditar RTF' }}
          </h2>
          <p class="text-sm text-muted-foreground">Especialista Regional (UR)</p>
        </div>
        @if (viewState() === 'audit') {
          <button class="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors" (click)="volverBandeja()">
            <span class="material-symbols-outlined text-[16px] align-text-bottom mr-1">arrow_back</span>
            Volver a bandeja
          </button>
        }
      </div>

      <!-- Bandeja View -->
      @if (viewState() === 'list') {
        <div class="bg-surface-container-lowest border border-border rounded-xl overflow-hidden">
          @if (loading()) {
            <div class="p-12 text-center text-sm text-muted-foreground">Cargando RTFs pendientes...</div>
          } @else if (rtfService.urRtfList().length === 0) {
            <div class="p-12 text-center text-sm text-muted-foreground">No hay RTFs pendientes de auditoría regional en este momento.</div>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground bg-muted/20">
                    <th class="px-5 py-3 font-semibold">Convenio</th>
                    <th class="px-5 py-3 font-semibold">Paso</th>
                    <th class="px-5 py-3 font-semibold">Estado</th>
                    <th class="px-5 py-3 font-semibold">Inicio</th>
                    <th class="px-5 py-3 font-semibold">Fin</th>
                    <th class="px-5 py-3 font-semibold">Acción</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border">
                  @for (rtf of rtfService.urRtfList(); track rtf.ideRtf) {
                    <tr class="hover:bg-muted/10 transition-colors">
                      <td class="px-5 py-3.5 font-medium text-foreground">{{ rtf.ideConvenio }}</td>
                      <td class="px-5 py-3.5">{{ rtf.numPasoCritico }}</td>
                      <td class="px-5 py-3.5">
                        <span class="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-warning/20 bg-warning/10 text-warning">
                          {{ rtf.estRtf }}
                        </span>
                      </td>
                      <td class="px-5 py-3.5 text-muted-foreground">{{ rtf.fecInicioPeriodo | date:'dd/MM/yyyy' }}</td>
                      <td class="px-5 py-3.5 text-muted-foreground">{{ rtf.fecFinPeriodo | date:'dd/MM/yyyy' }}</td>
                      <td class="px-5 py-3.5">
                        <button class="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors" (click)="seleccionarRtf(rtf.ideRtf!)">
                          Auditar
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }

      <!-- Audit View -->
      @if (viewState() === 'audit') {
        @if (loading()) {
          <div class="p-12 text-center text-sm text-muted-foreground">Cargando RTF completo...</div>
        } @else {
          <!-- RTF Read-only Header -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="bg-surface-container-lowest border border-border rounded-xl p-4 space-y-1">
              <span class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Convenio</span>
              <p class="text-sm font-bold text-foreground">{{ rtfService.rtfId() }}</p>
            </div>
            <div class="bg-surface-container-lowest border border-border rounded-xl p-4 space-y-1">
              <span class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Paso Crítico</span>
              <p class="text-sm font-bold text-primary">{{ rtfService.rtfId() }}</p>
            </div>
            <div class="bg-surface-container-lowest border border-border rounded-xl p-4 space-y-1">
              <span class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Estado</span>
              <p class="text-sm font-bold text-warning">{{ rtfService.rtfStatusLabel() }}</p>
            </div>
            <div class="bg-surface-container-lowest border border-border rounded-xl p-4 space-y-1">
              <span class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Período</span>
              <p class="text-sm font-bold text-foreground">{{ rtfService.rtfId() }}</p>
            </div>
          </div>

          <!-- R1 - Información Cualitativa -->
          <div class="bg-surface-container-lowest border border-border rounded-xl p-5">
            <h3 class="text-xs font-bold text-foreground uppercase tracking-wider mb-4">R1 · Información Cualitativa</h3>
            <div class="grid gap-4 md:grid-cols-2">
              <div>
                <span class="text-[10px] font-semibold text-muted-foreground uppercase">Actividades Realizadas</span>
                <p class="text-sm mt-1 text-foreground">{{ rtfService.txtActividadesRealizadas() || '—' }}</p>
              </div>
              <div>
                <span class="text-[10px] font-semibold text-muted-foreground uppercase">Actividades No Realizadas</span>
                <p class="text-sm mt-1 text-foreground">{{ rtfService.txtActividadesNoRealizadas() || '—' }}</p>
              </div>
              <div>
                <span class="text-[10px] font-semibold text-muted-foreground uppercase">Logros Alcanzados</span>
                <p class="text-sm mt-1 text-foreground">{{ rtfService.txtLogros() || '—' }}</p>
              </div>
              <div>
                <span class="text-[10px] font-semibold text-muted-foreground uppercase">Dificultades</span>
                <p class="text-sm mt-1 text-foreground">{{ rtfService.txtDificultades() || '—' }}</p>
              </div>
              <div class="md:col-span-2">
                <span class="text-[10px] font-semibold text-muted-foreground uppercase">Cambios Respecto al Plan</span>
                <p class="text-sm mt-1 text-foreground">{{ rtfService.txtCambiosPaso() || '—' }}</p>
              </div>
            </div>
          </div>

          <!-- F1 - Consolidado Financiero -->
          <div class="bg-surface-container-lowest border border-border rounded-xl overflow-hidden">
            <div class="px-5 py-4 border-b border-border bg-surface-container/10">
              <h3 class="text-xs font-bold text-foreground">F1 · Consolidación Financiera KOFIX</h3>
            </div>
            @if (rtfService.gastosF1().length === 0) {
              <div class="p-5 text-sm text-muted-foreground">Sin datos financieros.</div>
            } @else {
              <div class="overflow-x-auto">
                <table class="w-full text-xs">
                  <thead>
                    <tr class="bg-muted/20 border-b border-border text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                      <th class="px-5 py-3 text-left">Item</th>
                      <th class="px-5 py-3 text-center">Unidad</th>
                      <th class="px-5 py-3 text-right">Cantidad</th>
                      <th class="px-5 py-3 text-right">P. Adjudicado</th>
                      <th class="px-5 py-3 text-right">Monto Rendido</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border">
                    @for (g of rtfService.gastosF1(); track g.ideGastoF1) {
                      <tr class="hover:bg-muted/5">
                        <td class="px-5 py-3 font-medium text-foreground">{{ g.txtItemNombre }}</td>
                        <td class="px-5 py-3 text-center text-muted-foreground">{{ g.txtUnidadMedida }}</td>
                        <td class="px-5 py-3 text-right tabular-nums">{{ g.canCantidad }}</td>
                        <td class="px-5 py-3 text-right tabular-nums">S/ {{ g.numPrecioAdjudicado | number:'1.2-2' }}</td>
                        <td class="px-5 py-3 text-right tabular-nums font-semibold">S/ {{ g.numMontoRendido | number:'1.2-2' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>

          <!-- T1 - Metas Físicas -->
          <div class="bg-surface-container-lowest border border-border rounded-xl overflow-hidden">
            <div class="px-5 py-4 border-b border-border bg-surface-container/10">
              <h3 class="text-xs font-bold text-foreground">T1 · Metas Físicas Declaradas</h3>
            </div>
            @if (rtfService.metas().length === 0) {
              <div class="p-5 text-sm text-muted-foreground">Sin metas físicas.</div>
            } @else {
              <div class="overflow-x-auto">
                <table class="w-full text-xs">
                  <thead>
                    <tr class="bg-muted/20 border-b border-border text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                      <th class="px-5 py-3 text-left">Actividad</th>
                      <th class="px-5 py-3 text-center">Unidad</th>
                      <th class="px-5 py-3 text-right">Programado</th>
                      <th class="px-5 py-3 text-right">Ejecutado</th>
                      <th class="px-5 py-3 text-center">%</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border">
                    @for (m of rtfService.metas(); track m.ideMetaFisica) {
                      <tr class="hover:bg-muted/5">
                        <td class="px-5 py-3 font-medium text-foreground">{{ m.actividad }}</td>
                        <td class="px-5 py-3 text-center text-muted-foreground">{{ m.unidad }}</td>
                        <td class="px-5 py-3 text-right tabular-nums">{{ m.canProgramada }}</td>
                        <td class="px-5 py-3 text-right tabular-nums font-semibold">{{ m.canEjecutada ?? '—' }}</td>
                        <td class="px-5 py-3 text-center">
                          @if (m.canEjecutada != null && m.canProgramada > 0) {
                            <span class="text-xs font-bold" [class.text-success]="(m.canEjecutada / m.canProgramada) >= 1" [class.text-warning]="(m.canEjecutada / m.canProgramada) < 1">
                              {{ (m.canEjecutada / m.canProgramada) | percent:'1.0-0' }}
                            </span>
                          } @else {
                            <span class="text-muted-foreground/50">—</span>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>

          <!-- R2 - Indicadores -->
          <div class="bg-surface-container-lowest border border-border rounded-xl overflow-hidden">
            <div class="px-5 py-4 border-b border-border bg-surface-container/10">
              <h3 class="text-xs font-bold text-foreground">R2 · Indicadores</h3>
            </div>
            @if (rtfService.indicadores().length === 0) {
              <div class="p-5 text-sm text-muted-foreground">Sin indicadores.</div>
            } @else {
              <div class="overflow-x-auto">
                <table class="w-full text-xs">
                  <thead>
                    <tr class="bg-muted/20 border-b border-border text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                      <th class="px-5 py-3 text-left">Indicador</th>
                      <th class="px-5 py-3 text-center">Unidad</th>
                      <th class="px-5 py-3 text-right">Programado</th>
                      <th class="px-5 py-3 text-right">Ejecutado</th>
                      <th class="px-5 py-3 text-center">%</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border">
                    @for (ind of rtfService.indicadores(); track ind.ideIndicadorAvance) {
                      <tr class="hover:bg-muted/5">
                        <td class="px-5 py-3 font-medium text-foreground">{{ ind.nombre }}</td>
                        <td class="px-5 py-3 text-center text-muted-foreground">{{ ind.unidad }}</td>
                        <td class="px-5 py-3 text-right tabular-nums">{{ ind.canProgramado }}</td>
                        <td class="px-5 py-3 text-right tabular-nums font-semibold">{{ ind.canEjecutado ?? '—' }}</td>
                        <td class="px-5 py-3 text-center">
                          @if (ind.canEjecutado != null && ind.canProgramado > 0) {
                            <span class="text-xs font-bold" [class.text-success]="(ind.canEjecutado / ind.canProgramado) >= 1" [class.text-warning]="(ind.canEjecutado / ind.canProgramado) < 1">
                              {{ (ind.canEjecutado / ind.canProgramado) | percent:'1.0-0' }}
                            </span>
                          } @else {
                            <span class="text-muted-foreground/50">—</span>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>

          <!-- Evidencias descargables -->
          <div class="bg-surface-container-lowest border border-border rounded-xl p-5">
            <h3 class="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Evidencias Descargables (PDF)</h3>
            @if (rtfService.evidencias().length === 0) {
              <p class="text-sm text-muted-foreground">Sin evidencias cargadas.</p>
            } @else {
              <div class="grid gap-2 sm:grid-cols-2">
                @for (ev of rtfService.evidencias(); track ev.ideEvidencia) {
                  <div class="flex items-center gap-2 rounded-lg border border-border bg-surface-container/20 px-3 py-2 text-sm">
                    <span class="material-symbols-outlined text-[18px] text-primary">description</span>
                    <button class="flex-1 truncate text-left hover:underline text-foreground" (click)="descargarEvidencia(ev)">
                      {{ ev.txtNombreArchivo ?? 'Documento' }}
                    </button>
                    <span class="text-xs text-muted-foreground">PDF</span>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Acta de Campo (Anexo 19) -->
          <div class="bg-surface-container-lowest border border-border rounded-xl p-5">
            <h3 class="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Auditoría de Campo · Anexo 19 (Acta de Campo)</h3>
            <p class="text-sm text-muted-foreground mb-4">
              Registre el Acta de Visita de Campo firmada manualmente. Requerido para derivar a UN Central.
            </p>
            @if (actaSubida()) {
              <div class="flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 p-3 text-sm">
                <span class="material-symbols-outlined text-[18px] text-success">check_circle</span>
                Conformidad UR registrada · <span class="font-mono">{{ actaFileName() }}</span>
              </div>
            } @else {
              <div
                class="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/20 p-6 text-center transition-all hover:border-primary/50 hover:bg-primary/5"
                (click)="actaFileInput.click()"
                (dragover)="$event.preventDefault()"
                (drop)="onActaDrop($event)"
              >
                <span class="material-symbols-outlined text-[28px] text-primary">cloud_upload</span>
                <div class="text-sm font-medium">Cargar Acta de Campo firmada (PDF, máx 10MB)</div>
                <div class="text-xs text-muted-foreground">PDF, máx 10MB</div>
                <input #actaFileInput type="file" accept="application/pdf" class="hidden" (change)="onActaSelect($event)" />
              </div>
            }
          </div>

          <!-- Evaluación por fila -->
          <div class="bg-surface-container-lowest border border-border rounded-xl p-5">
            <h3 class="text-xs font-bold text-foreground uppercase tracking-wider mb-4">Evaluación · Conforme / Observado por fila</h3>
            <div class="space-y-3">
              @for (row of evaluationRows(); track row.id) {
                <div class="rounded-lg border p-3" [ngClass]="evaluationRowClasses(row.id)">
                  <div class="mb-2 flex items-center justify-between">
                    <div class="text-sm font-medium text-foreground">
                      {{ row.label }} <span class="ml-2 font-mono text-xs text-muted-foreground">{{ row.value }}</span>
                    </div>
                    <div class="flex gap-3">
                      <label class="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input type="checkbox" class="accent-success" [checked]="rowEvalMap()[row.id]?.estConformidad === 'CONFORME'" (change)="setEvaluacion(row.id, 'CONFORME')" />
                        <span class="material-symbols-outlined text-[16px] text-success">check_circle</span>
                        Conforme
                      </label>
                      <label class="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input type="checkbox" class="accent-destructive" [checked]="rowEvalMap()[row.id]?.estConformidad === 'OBSERVADO'" (change)="setEvaluacion(row.id, 'OBSERVADO')" />
                        <span class="material-symbols-outlined text-[16px] text-destructive">cancel</span>
                        Observado
                      </label>
                    </div>
                  </div>
                  @if (rowEvalMap()[row.id]?.estConformidad === 'OBSERVADO') {
                    <textarea
                      class="w-full rounded-xl border border-border bg-surface-container/20 px-3 py-2 text-xs resize-y min-h-[60px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      placeholder="Comentario obligatorio de la observacion..."
                      [value]="rowEvalMap()[row.id]?.txtObservacion ?? ''"
                      (input)="setObservacion(row.id, $any($event.target).value)"
                      rows="2"
                    ></textarea>
                  }
                  @if (rowNeedsComment(row.id)) {
                    <div class="mt-1 text-[11px] text-destructive">Debe ingresar un comentario justificando la observacion.</div>
                  }
                </div>
              }
            </div>
          </div>

          <!-- Sticky Footer Actions -->
          <div class="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface-container-lowest border border-border p-4 shadow-lg">
            <div class="text-sm text-muted-foreground">
              @if (!actaSubida()) {
                Cargue el Acta de Campo (Anexo 19) para habilitar la derivación.
              } @else if (!allMarked()) {
                Marque Conforme u Observado en cada fila.
              } @else if (observedRows().length > 0) {
                {{ observedRows().length }} fila(s) observada(s) · devolver a la OA
              } @else {
                Todo conforme · derivar a UN Central
              }
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                class="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                [disabled]="!canReturn() || rtfService.rtfStatus() === 'IN_REVISION_UN'"
                (click)="devolverOA()"
              >
                <span class="material-symbols-outlined text-[16px] align-text-bottom mr-1">undo</span>
                Devolver a OA (Observado)
              </button>
              <button
                class="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                [disabled]="!canDerive() || rtfService.rtfStatus() === 'IN_REVISION_UN'"
                (click)="derivarUN()"
              >
                <span class="material-symbols-outlined text-[16px] align-text-bottom mr-1">send</span>
                Derivar a UN Central
              </button>
            </div>
          </div>
        }
      }
    </div>
  `
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

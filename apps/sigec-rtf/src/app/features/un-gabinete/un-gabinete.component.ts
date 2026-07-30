import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RtfService, EvidenceDto } from '../../core/services/rtf.service';
import { ToastService } from '@agroideas/ui';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-un-gabinete',
  standalone: true,
  imports: [CommonModule, DecimalPipe, DatePipe],
  providers: [DecimalPipe, DatePipe],
  template: `
    <div class="space-y-6 animate-fade-in">

      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold tracking-tight text-foreground">
            {{ viewState() === 'list' ? 'Evaluaci\u00F3n de Gabinete' : 'Revisar RTF' }}
          </h2>
          <p class="text-sm text-muted-foreground">Especialista UN Central / Direcci\u00F3n Ejecutiva / USE</p>
        </div>
        @if (viewState() === 'audit') {
          <button class="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors" (click)="volverBandeja()">
            <span class="material-symbols-outlined text-[16px] align-text-bottom mr-1">arrow_back</span>
            Volver a la bandeja
          </button>
        }
      </div>

      <!-- Bandeja (lista) -->
      @if (viewState() === 'list') {
        @if (loadingBandeja()) {
          <div class="flex items-center justify-center py-16">
            <span class="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
            <span class="ml-3 text-sm text-muted-foreground">Cargando RTFs pendientes...</span>
          </div>
        } @else if (unRtfList().length === 0) {
          <div class="flex flex-col items-center justify-center py-20 text-center">
            <span class="material-symbols-outlined text-5xl text-muted-foreground/40 mb-4">fact_check</span>
            <p class="text-sm font-medium text-foreground">No hay RTFs pendientes de evaluaci\u00F3n de gabinete</p>
            <p class="text-xs text-muted-foreground mt-1">Los RTFs derivados por UR aparecer\u00E1n aqu\u00ED autom\u00E1ticamente.</p>
          </div>
        } @else {
          <div class="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-border bg-muted/30">
                    <th class="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">ID RTF</th>
                    <th class="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Convenio</th>
                    <th class="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Paso Cr\u00EDtico</th>
                    <th class="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Estado</th>
                    <th class="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Fec. L\u00EDmite</th>
                    <th class="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Fec. Recepci\u00F3n</th>
                    <th class="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Acci\u00F3n</th>
                  </tr>
                </thead>
                <tbody>
                  @for (rtf of unRtfList(); track rtf.ideRtf) {
                    <tr class="border-b border-border hover:bg-muted/20 transition-colors">
                      <td class="px-4 py-3 font-mono text-xs">{{ rtf.ideRtf }}</td>
                      <td class="px-4 py-3 font-medium">{{ rtf.ideConvenio }}</td>
                      <td class="px-4 py-3">{{ rtf.numPasoCritico }}</td>
                      <td class="px-4 py-3">
                        <span class="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-primary/20 bg-primary/10 text-primary">
                          {{ rtfService.rtfStatusLabel() }}
                        </span>
                      </td>
                      <td class="px-4 py-3 text-xs">{{ rtf.fecLimite | date:'dd/MM/yyyy' }}</td>
                      <td class="px-4 py-3 text-xs">{{ getFecRegistro(rtf) | date:'dd/MM/yyyy' }}</td>
                      <td class="px-4 py-3 text-right">
                        <button class="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40" (click)="seleccionarRtf(rtf.ideRtf!)">
                          Revisar
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
      }

      <!-- Vista Auditoría -->
      @if (viewState() === 'audit') {
        @if (loadingCompleto()) {
          <div class="flex items-center justify-center py-16">
            <span class="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
            <span class="ml-3 text-sm text-muted-foreground">Cargando RTF completo...</span>
          </div>
        } @else {
          <!-- Cabecera -->
          <div class="bg-card border border-border rounded-xl p-5 shadow-sm">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Convenio</p>
                <p class="text-sm font-bold text-foreground">{{ rtfService.convenioId() }}</p>
              </div>
              <div>
                <p class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Paso Cr\u00EDtico</p>
                <p class="text-sm font-bold text-foreground">{{ rtfService.activePasoNumero() }} de {{ rtfService.totalPasos() }}</p>
              </div>
              <div>
                <p class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Estado</p>
                <p class="text-sm font-bold text-primary">{{ rtfService.rtfStatusLabel() }}</p>
              </div>
              <div>
                <p class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Avance F\u00EDsico</p>
                <p class="text-sm font-bold text-foreground">{{ rtfService.physicalProgress() }}%</p>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <!-- R1 - Información Cualitativa -->
            <div class="bg-card border border-border rounded-xl p-5 shadow-sm">
              <h3 class="text-xs font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <span class="material-symbols-outlined text-[16px] text-primary">description</span>
                R1 - Informaci\u00F3n Cualitativa
              </h3>
              <div class="space-y-3">
                @for (item of r1Items(); track item.label) {
                  <div>
                    <p class="text-[11px] font-semibold text-muted-foreground mb-0.5">{{ item.label }}</p>
                    <p class="text-sm text-foreground whitespace-pre-wrap">{{ item.value || 'Sin informaci\u00F3n' }}</p>
                  </div>
                }
              </div>
            </div>

            <!-- F1 - Gastos Financieros -->
            <div class="bg-card border border-border rounded-xl p-5 shadow-sm">
              <h3 class="text-xs font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <span class="material-symbols-outlined text-[16px] text-primary">account_balance</span>
                F1 - Gastos Financieros
              </h3>
              @if (rtfService.gastosF1().length === 0) {
                <p class="text-sm text-muted-foreground">Sin gastos registrados.</p>
              } @else {
                <div class="overflow-x-auto">
                  <table class="w-full text-xs">
                    <thead>
                      <tr class="border-b border-border">
                        <th class="text-left py-1.5 font-semibold text-muted-foreground">Item</th>
                        <th class="text-right py-1.5 font-semibold text-muted-foreground">Cant.</th>
                        <th class="text-right py-1.5 font-semibold text-muted-foreground">P. Adjud.</th>
                        <th class="text-right py-1.5 font-semibold text-muted-foreground">Monto Rendido</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (g of rtfService.gastosF1(); track g.ideGastoF1) {
                        <tr class="border-b border-border/40">
                          <td class="py-1.5">{{ g.txtItemNombre }}</td>
                          <td class="text-right py-1.5">{{ g.canCantidad | number:'1.0-0' }}</td>
                          <td class="text-right py-1.5">{{ g.numPrecioAdjudicado | number:'1.2-2' }}</td>
                          <td class="text-right py-1.5">{{ g.numMontoRendido | number:'1.2-2' }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>

            <!-- T1 - Metas Físicas -->
            <div class="bg-card border border-border rounded-xl p-5 shadow-sm">
              <h3 class="text-xs font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <span class="material-symbols-outlined text-[16px] text-primary">checklist</span>
                T1 - Metas F\u00EDsicas
              </h3>
              @if (rtfService.metas().length === 0) {
                <p class="text-sm text-muted-foreground">Sin metas registradas.</p>
              } @else {
                <div class="space-y-3">
                  @for (m of rtfService.metas(); track m.ideActividad) {
                    <div>
                      <div class="flex justify-between text-xs mb-1">
                        <span class="text-foreground font-medium truncate mr-2">{{ m.txtComentario || 'Actividad' }}</span>
                        <span class="text-muted-foreground whitespace-nowrap">{{ (m.canEjecutada ?? 0) | number:'1.0-1' }} / {{ m.canProgramada | number:'1.0-1' }}</span>
                      </div>
                      <div class="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                        <div class="h-full rounded-full transition-all" [class.bg-success]="(m.canEjecutada ?? 0) >= m.canProgramada" [class.bg-warning]="(m.canEjecutada ?? 0) < m.canProgramada" [style.width.%]="((m.canEjecutada ?? 0) / (m.canProgramada || 1)) * 100"></div>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- R2 - Indicadores -->
            <div class="bg-card border border-border rounded-xl p-5 shadow-sm">
              <h3 class="text-xs font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <span class="material-symbols-outlined text-[16px] text-primary">analytics</span>
                R2 - Indicadores
              </h3>
              @if (rtfService.indicadores().length === 0) {
                <p class="text-sm text-muted-foreground">Sin indicadores registrados.</p>
              } @else {
                <div class="space-y-3">
                  @for (ind of rtfService.indicadores(); track ind.ideIndicador) {
                    <div>
                      <div class="flex justify-between text-xs mb-1">
                        <span class="text-foreground font-medium truncate mr-2">{{ ind.txtComentario || 'Indicador' }}</span>
                        <span class="text-muted-foreground whitespace-nowrap">{{ (ind.canEjecutado ?? 0) | number:'1.0-1' }} / {{ ind.canProgramado | number:'1.0-1' }}</span>
                      </div>
                      <div class="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                        <div class="h-full rounded-full transition-all" [class.bg-success]="(ind.canEjecutado ?? 0) >= ind.canProgramado" [class.bg-warning]="(ind.canEjecutado ?? 0) < ind.canProgramado" [style.width.%]="((ind.canEjecutado ?? 0) / (ind.canProgramado || 1)) * 100"></div>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

          </div>

          <!-- Evidencias -->
          <div class="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 class="text-xs font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <span class="material-symbols-outlined text-[16px] text-primary">folder</span>
              Evidencias Adjuntas
            </h3>
            @if (evidencias().length === 0) {
              <p class="text-sm text-muted-foreground">Sin evidencias adjuntas.</p>
            } @else {
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                @for (ev of evidencias(); track ev.ideEvidencia) {
                  <div class="flex items-center gap-3 rounded-lg border border-border p-3">
                    <span class="material-symbols-outlined text-2xl text-primary">picture_as_pdf</span>
                    <div class="min-w-0 flex-1">
                      <p class="text-xs font-medium text-foreground truncate">{{ ev.txtNombreArchivo }}</p>
                      <p class="text-[10px] text-muted-foreground">{{ ev.fecRegistro | date:'dd/MM/yyyy' }}</p>
                    </div>
                    <button class="text-primary hover:text-primary/80 transition-colors" (click)="descargarEvidencia(ev)" title="Descargar">
                      <span class="material-symbols-outlined text-lg">download</span>
                    </button>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Evaluación Anexo 18 (Informe de Comprobación) -->
          <div class="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 class="text-xs font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <span class="material-symbols-outlined text-[16px] text-primary">summarize</span>
              Anexo 18 - Informe de Comprobaci\u00F3n
            </h3>
            @if (anexo18Empty()) {
              <p class="text-sm text-muted-foreground">A\u00FAn no se ha generado el Informe de Comprobaci\u00F3n (Anexo 18).</p>
              <button class="mt-3 rounded-lg bg-primary/10 text-primary px-4 py-2 text-xs font-medium hover:bg-primary/20 transition-colors" (click)="generarAnexo18()">
                <span class="material-symbols-outlined text-[16px] align-text-bottom mr-1">download</span>
                Generar PDF Anexo 18
              </button>
            } @else {
              <div class="space-y-2 text-sm">
                <p><span class="font-semibold text-muted-foreground">N\u00FAmero Informe:</span> {{ anexo18()?.txtNumeroInforme }}</p>
                <p><span class="font-semibold text-muted-foreground">Representante UN:</span> {{ anexo18()?.txtRepresentanteUn }}</p>
                <p><span class="font-semibold text-muted-foreground">Conclusiones:</span> {{ anexo18()?.txtConclusiones || 'Sin conclusiones' }}</p>
              </div>
              <button class="mt-3 rounded-lg bg-primary/10 text-primary px-4 py-2 text-xs font-medium hover:bg-primary/20 transition-colors" (click)="generarAnexo18()">
                <span class="material-symbols-outlined text-[16px] align-text-bottom mr-1">download</span>
                Descargar PDF Anexo 18
              </button>
            }
          </div>

          <!-- Observaciones para Devolver -->
          @if (showDevolverForm()) {
            <div class="bg-card border border-border rounded-xl p-5 shadow-sm">
              <h3 class="text-xs font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <span class="material-symbols-outlined text-[16px] text-destructive">rate_review</span>
                Devolver a OA - Observaciones
              </h3>
              <textarea
                class="w-full rounded-xl border border-border bg-surface-container/20 px-3 py-2 text-xs resize-y min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                placeholder="Describa las observaciones para la correcci\u00F3n..."
                [value]="devolverObservacion()"
                (input)="devolverObservacion.set($any($event.target).value)"
                rows="3"
              ></textarea>
              @if (!devolverObservacion().trim()) {
                <p class="mt-1 text-[11px] text-destructive">Debe ingresar una observaci\u00F3n para devolver el RTF.</p>
              }
            </div>
          }

          <!-- Sticky Footer Actions -->
          <div class="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface-container-lowest border border-border p-4 shadow-lg">
            <div class="text-sm text-muted-foreground">
              RTF en evaluaci\u00F3n de gabinete
            </div>
            <div class="flex flex-wrap items-center gap-2">
              @if (showDevolverForm()) {
                <button class="rounded-xl border border-border bg-surface-container/20 px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors" (click)="toggleDevolverForm()">
                  Cancelar
                </button>
                <button class="rounded-xl bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-40" (click)="devolverRtf()" [disabled]="accionEjecutandose()">
                  <span class="material-symbols-outlined text-[16px] align-text-bottom mr-1">undo</span>
                  Confirmar Devoluci\u00F3n
                </button>
              } @else {
                <button class="rounded-xl border border-border bg-surface-container/20 px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors" (click)="toggleDevolverForm()">
                  <span class="material-symbols-outlined text-[16px] align-text-bottom mr-1">undo</span>
                  Devolver a OA
                </button>
              }
              <button class="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/20 transition-colors" (click)="rechazar()" [disabled]="accionEjecutandose()">
                <span class="material-symbols-outlined text-[16px] align-text-bottom mr-1">cancel</span>
                Rechazar
              </button>
              <button class="rounded-xl bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40" (click)="aprobar()" [disabled]="accionEjecutandose()">
                <span class="material-symbols-outlined text-[16px] align-text-bottom mr-1">check_circle</span>
                Aprobar
              </button>
            </div>
          </div>

        }
      }

    </div>
  `
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

  // UN signals
  unRtfList = this.rtfService.unRtfList;
  evidencias = signal<EvidenceDto[]>([]);
  anexo18 = signal<any>(null);

  // Devolver form
  showDevolverForm = signal(false);
  devolverObservacion = signal('');

  // R1 items for template display
  r1Items = computed(() => [
    { label: 'Actividades Realizadas', value: this.rtfService.txtActividadesRealizadas() },
    { label: 'Actividades No Realizadas', value: this.rtfService.txtActividadesNoRealizadas() },
    { label: 'Logros', value: this.rtfService.txtLogros() },
    { label: 'Dificultades', value: this.rtfService.txtDificultades() },
    { label: 'Cambios en el Paso', value: this.rtfService.txtCambiosPaso() },
  ]);

  anexo18Empty = computed(() => {
    const a = this.anexo18();
    return !a || Object.keys(a).length === 0;
  });

  ngOnInit() {
    this.cargarBandeja();
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  getFecRegistro(rtf: any) {
    return rtf.fecRegistro ?? null;
  }

  private cargarBandeja() {
    this.loadingBandeja.set(true);
    this.subs.add(
      this.rtfService.loadBandejaUn().subscribe({
        next: () => this.loadingBandeja.set(false),
        error: () => this.loadingBandeja.set(false)
      })
    );
  }

  seleccionarRtf(rtfId: number) {
    this.rtfService.unSelectedRtfId.set(rtfId);
    this.loadingCompleto.set(true);
    this.viewState.set('audit');
    this.showDevolverForm.set(false);
    this.devolverObservacion.set('');
    this.anexo18.set(null);

    this.subs.add(
      this.rtfService.loadRtfCompleto(rtfId).subscribe({
        next: (data) => {
          if (data) {
            this.evidencias.set(data.evidencias || []);
            this.cargarAnexo18(rtfId);
          }
          this.loadingCompleto.set(false);
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
          this.toast.success('RTF devuelto a OA para correcci\u00F3n');
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

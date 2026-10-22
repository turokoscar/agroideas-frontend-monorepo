import { Component, WritableSignal, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService, UIButtonComponent, UIModalComponent } from '@agroideas/ui';
import { mensajeParaUsuario } from '@agroideas/utils';
import { environment } from '../../../../environments/environment';
import { CierreApiService } from '../../../core/services/cierre-api.service';
import { SelectorPdfComponent } from '../../../shared/selector-pdf.component';

/**
 * Revisión legal de la UAJ (`EN_REVISION_UAJ`), ADR 0013 Fase 4: observa el expediente (vuelve a la UN, que
 * subsana con una versión nueva del Anexo 22) o remite el Informe Legal y el Proyecto de RDE a la DE.
 */
@Component({
  selector: 'app-revision-uaj',
  standalone: true,
  host: { class: 'block' },
  imports: [FormsModule, UIButtonComponent, UIModalComponent, SelectorPdfComponent],
  template: `
    <div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <section class="form-card-flat space-y-3">
        <h5 class="form-section-title">Observar el expediente</h5>
        <p class="text-xs text-muted-foreground">
          El expediente vuelve a la Unidad de Negocios, que deberá responder cada observación y presentar una versión nueva del
          Informe de Evaluación firmada.
        </p>
        <ui-button icon="rate_review" label="Registrar observaciones" severity="warning" (onClick)="abrirObservar()" />
      </section>

      <section class="form-card-flat space-y-3">
        <h5 class="form-section-title">Remitir a la Dirección Ejecutiva</h5>
        <app-selector-pdf etiqueta="Informe Legal" [(archivo)]="informeLegal" />
        <app-selector-pdf etiqueta="Proyecto de RDE" [(archivo)]="proyectoRde" />
        <ui-button icon="send" label="Remitir Informe Legal y Proyecto de RDE" [disabled]="!informeLegal() || !proyectoRde()"
          (onClick)="confirmarRemitir.set(true)" />
      </section>
    </div>

    <app-ui-modal [visible]="modalObservar()" title="Observar el expediente" subtitle="Una observación por fila; la UN responderá cada una."
      icon="rate_review" maxWidth="680px" saveLabel="Observar" saveIcon="rate_review" [isSubmitting]="enviando()"
      [saveDisabled]="!observacionesValidas()" (onHide)="modalObservar.set(false)" (onSave)="observar()">
      <div class="space-y-3">
        @for (o of observaciones(); track $index) {
          <div class="flex items-start gap-2">
            <span class="mt-2 w-5 text-xs font-semibold text-muted-foreground">{{ $index + 1 }}.</span>
            <textarea rows="2" class="form-textarea" [maxlength]="longitud" [attr.aria-label]="'Observación ' + ($index + 1)"
              [ngModel]="o" (ngModelChange)="editarObservacion($index, $event)"></textarea>
            @if (observaciones().length > 1) {
              <ui-button iconOnly size="sm" appearance="soft" severity="danger" icon="delete" [ariaLabel]="'Quitar la observación ' + ($index + 1)" (onClick)="quitarObservacion($index)" />
            }
          </div>
        }
        @if (observaciones().length < maximo) {
          <ui-button size="sm" appearance="soft" icon="add" label="Agregar observación" (onClick)="agregarObservacion()" />
        }
      </div>
    </app-ui-modal>

    <app-ui-modal [visible]="confirmarRemitir()" title="Remitir a la Dirección Ejecutiva" subtitle="Termina la revisión legal."
      icon="send" maxWidth="460px" saveLabel="Remitir" saveIcon="send" [isSubmitting]="enviando()"
      (onHide)="confirmarRemitir.set(false)" (onSave)="remitir()">
      <p class="text-sm text-foreground">
        Se remitirán <span class="font-semibold">{{ informeLegal()?.name }}</span> y <span class="font-semibold">{{ proyectoRde()?.name }}</span>
        a la Dirección Ejecutiva para que suscriba la RDE de cierre.
      </p>
    </app-ui-modal>
  `
})
export class RevisionUajComponent {
  private api = inject(CierreApiService);
  private toast = inject(ToastService);

  ideCierre = input.required<number>();
  cambio = output<void>();

  readonly maximo = environment.revisionLegal.maximoObservaciones;
  readonly longitud = environment.revisionLegal.longitudObservacion;

  modalObservar = signal(false);
  confirmarRemitir = signal(false);
  enviando = signal(false);
  observaciones = signal<string[]>(['']);
  informeLegal = signal<File | null>(null);
  proyectoRde = signal<File | null>(null);

  /** Al menos una observación y ninguna vacía (como `ObservarUajRequestValidator`). */
  observacionesValidas = computed(() => {
    const lista = this.observaciones();
    return lista.length > 0 && lista.length <= this.maximo && lista.every(o => o.trim().length > 0);
  });

  abrirObservar() {
    this.observaciones.set(['']);
    this.modalObservar.set(true);
  }

  editarObservacion(indice: number, texto: string) {
    this.observaciones.update(lista => lista.map((o, i) => (i === indice ? texto : o)));
  }

  agregarObservacion() {
    this.observaciones.update(lista => [...lista, '']);
  }

  quitarObservacion(indice: number) {
    this.observaciones.update(lista => lista.filter((_, i) => i !== indice));
  }

  observar() {
    if (!this.observacionesValidas()) return;
    this.enviando.set(true);
    this.api.observar(this.ideCierre(), this.observaciones().map(o => o.trim())).subscribe({
      next: () => this.terminar('Expediente observado', 'Volvió a la Unidad de Negocios para que lo subsane.', this.modalObservar),
      error: err => this.fallar('No se pudo observar el expediente', err, this.modalObservar)
    });
  }

  remitir() {
    const informe = this.informeLegal();
    const proyecto = this.proyectoRde();
    if (!informe || !proyecto) return;
    this.enviando.set(true);
    this.api.remitirProyectoRde(this.ideCierre(), informe, proyecto).subscribe({
      next: () => this.terminar('Proyecto de RDE remitido', 'La Dirección Ejecutiva suscribirá la RDE de cierre.', this.confirmarRemitir),
      error: err => this.fallar('No se pudo remitir el Proyecto de RDE', err, this.confirmarRemitir)
    });
  }

  private terminar(titulo: string, detalle: string, modal: WritableSignal<boolean>) {
    this.enviando.set(false);
    modal.set(false);
    this.toast.success(titulo, detalle);
    this.cambio.emit();
  }

  private fallar(titulo: string, err: unknown, modal: WritableSignal<boolean>) {
    this.enviando.set(false);
    modal.set(false);
    this.toast.error(titulo, mensajeParaUsuario(err, 'Intente nuevamente.'));
  }
}

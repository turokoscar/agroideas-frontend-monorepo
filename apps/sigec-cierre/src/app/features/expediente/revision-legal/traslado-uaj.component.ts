import { Component, inject, input, output, signal } from '@angular/core';
import { ToastService, UIButtonComponent, UIModalComponent } from '@agroideas/ui';
import { mensajeParaUsuario } from '@agroideas/utils';
import { CierreApiService } from '../../../core/services/cierre-api.service';

/**
 * La Dirección Ejecutiva traslada el Expediente Único a la UAJ (`DERIVADO_DE → EN_REVISION_UAJ`), ADR 0013
 * Fase 4. Abre el plazo de la revisión legal, nuevo en cada ingreso (también tras una subsanación).
 */
@Component({
  selector: 'app-traslado-uaj',
  standalone: true,
  host: { class: 'block' },
  imports: [UIButtonComponent, UIModalComponent],
  template: `
    <section class="form-card-flat mt-4 space-y-3">
      <h5 class="form-section-title">Trasladar a la Unidad de Asesoría Jurídica</h5>
      <p class="text-xs text-slate-600">
        Revise el Expediente Único (Informe de Evaluación firmado y documentos de las etapas anteriores) y trasládelo a la UAJ
        para su revisión legal. La UAJ tendrá su plazo para observarlo o remitir el Informe Legal y el Proyecto de RDE.
      </p>
      <ui-button icon="gavel" label="Trasladar a la UAJ" (onClick)="confirmar.set(true)" />
    </section>

    <app-ui-modal [visible]="confirmar()" title="Trasladar a la UAJ" subtitle="El expediente pasa a la revisión legal."
      icon="gavel" maxWidth="460px" saveLabel="Trasladar" saveIcon="gavel" [isSubmitting]="enviando()"
      (onHide)="confirmar.set(false)" (onSave)="trasladar()">
      <p class="text-sm text-foreground">Se trasladará el expediente a la Unidad de Asesoría Jurídica y empezará a correr su plazo.</p>
    </app-ui-modal>
  `
})
export class TrasladoUajComponent {
  private api = inject(CierreApiService);
  private toast = inject(ToastService);

  ideCierre = input.required<number>();
  /** El expediente cambió de estado. */
  cambio = output<void>();

  confirmar = signal(false);
  enviando = signal(false);

  trasladar() {
    this.enviando.set(true);
    this.api.derivar(this.ideCierre(), 'UAJ').subscribe({
      next: () => {
        this.enviando.set(false);
        this.confirmar.set(false);
        this.toast.success('Expediente trasladado', 'La UAJ inicia la revisión legal.');
        this.cambio.emit();
      },
      error: err => {
        this.enviando.set(false);
        this.confirmar.set(false);
        this.toast.error('No se pudo trasladar el expediente', mensajeParaUsuario(err, 'Intente nuevamente.'));
      }
    });
  }
}

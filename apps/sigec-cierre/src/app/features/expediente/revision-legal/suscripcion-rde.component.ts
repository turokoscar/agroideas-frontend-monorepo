import { Component, computed, inject, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService, UIButtonComponent, UIModalComponent } from '@agroideas/ui';
import { mensajeParaUsuario } from '@agroideas/utils';
import { environment } from '../../../../environments/environment';
import { CierreApiService } from '../../../core/services/cierre-api.service';
import { SelectorPdfComponent } from '../../../shared/selector-pdf.component';

/** Fecha local `yyyy-MM-dd` (el día en Perú, no en UTC). */
export function fechaLocal(fecha: Date = new Date()): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/**
 * La Dirección Ejecutiva carga la RDE suscrita (`PROYECTO_RDE_REMITIDO → CERRADO`), ADR 0013 Fase 4. La API
 * registra después el estado 77 (CONVENIO CERRADO) en el SEL; si falla, lo reintenta sin revertir el cierre.
 * La fecha de emisión no puede ser futura ni anterior a la remisión del Proyecto de RDE (como la API).
 */
@Component({
  selector: 'app-suscripcion-rde',
  standalone: true,
  imports: [DatePipe, FormsModule, UIButtonComponent, UIModalComponent, SelectorPdfComponent],
  template: `
    <section class="form-card-flat mt-4 space-y-4">
      <h5 class="form-section-title">Cargar la Resolución Directoral Ejecutiva</h5>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="form-field">
          <label class="form-label" for="rde-numero">Número de la RDE <span class="form-label-required">*</span></label>
          <input id="rde-numero" type="text" class="form-input" [maxlength]="longitudNumero" placeholder="Ej.: 045-2026-MIDAGRI-PCC/DE"
            [ngModel]="numero()" (ngModelChange)="numero.set($event)" />
        </div>
        <div class="form-field">
          <label class="form-label" for="rde-fecha">Fecha de emisión <span class="form-label-required">*</span></label>
          <input id="rde-fecha" type="date" class="form-input" [min]="minimo()" [max]="hoy" [ngModel]="fecha()" (ngModelChange)="fecha.set($event)" />
          @if (errorFecha()) { <span class="text-[11px] text-destructive">{{ errorFecha() }}</span> }
        </div>
      </div>
      <app-selector-pdf etiqueta="RDE suscrita" [(archivo)]="rde" />
      <ui-button icon="verified" label="Cargar RDE y cerrar el convenio" [disabled]="!valido()" (onClick)="confirmar.set(true)" />
    </section>

    <app-ui-modal [visible]="confirmar()" title="Cerrar el convenio" subtitle="Esta acción es definitiva."
      icon="verified" maxWidth="500px" saveLabel="Cerrar convenio" saveIcon="verified" [isSubmitting]="enviando()"
      (onHide)="confirmar.set(false)" (onSave)="suscribir()">
      <p class="text-sm text-foreground">
        Se registrará la RDE N° <span class="font-semibold">{{ numero() }}</span> del {{ fecha() | date: 'dd/MM/yyyy' }}. El expediente
        quedará <span class="font-semibold">CERRADO</span> y el convenio pasará al estado situacional 77 (CONVENIO CERRADO) en el SEL.
      </p>
    </app-ui-modal>
  `
})
export class SuscripcionRdeComponent {
  private api = inject(CierreApiService);
  private toast = inject(ToastService);

  ideCierre = input.required<number>();
  /** Remisión del Proyecto de RDE: la RDE no puede ser anterior. */
  fecRemisionProyecto = input<string | null>(null);
  cambio = output<void>();

  readonly longitudNumero = environment.revisionLegal.longitudNumeroRde;
  readonly hoy = fechaLocal();

  numero = signal('');
  fecha = signal(fechaLocal());
  rde = signal<File | null>(null);
  confirmar = signal(false);
  enviando = signal(false);

  minimo = computed(() => this.fecRemisionProyecto()?.slice(0, 10) ?? '');
  errorFecha = computed(() => {
    const fecha = this.fecha();
    if (!fecha) return null;
    if (fecha > this.hoy) return 'La fecha de emisión no puede ser posterior a hoy.';
    if (this.minimo() && fecha < this.minimo()) return 'No puede ser anterior a la remisión del Proyecto de RDE.';
    return null;
  });
  valido = computed(() => !!this.numero().trim() && !!this.fecha() && !this.errorFecha() && !!this.rde());

  suscribir() {
    const rde = this.rde();
    if (!rde || !this.valido()) return;
    this.enviando.set(true);
    this.api.suscribirRde(this.ideCierre(), this.numero().trim(), this.fecha(), rde).subscribe({
      next: () => {
        this.enviando.set(false);
        this.confirmar.set(false);
        this.toast.success('Convenio cerrado', `RDE N° ${this.numero().trim()} registrada.`);
        this.cambio.emit();
      },
      error: err => {
        this.enviando.set(false);
        this.confirmar.set(false);
        this.toast.error('No se pudo cargar la RDE', mensajeParaUsuario(err, 'Intente nuevamente.'));
      }
    });
  }
}

import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService, UIButtonComponent, UIModalComponent } from '@agroideas/ui';
import { mensajeParaUsuario } from '@agroideas/utils';
import { environment } from '../../../../environments/environment';
import { CierreApiService } from '../../../core/services/cierre-api.service';
import { ObservacionUajDto, pendientesDeSubsanar, ultimaRonda } from '../../../core/models/revision-legal.model';
import { InformeEvaluacionComponent } from '../informe-evaluacion/informe-evaluacion.component';

/**
 * Subsanación de la UN (`OBSERVADO_UAJ → DERIVADO_DE`), ADR 0013 Fase 4: responde todas las observaciones de la
 * última ronda de la UAJ y presenta firmada la versión nueva del Anexo 22 (reabierta al observar); con ambas cosas
 * eleva de nuevo a la DE (`POST …/subsanaciones`).
 */
@Component({
  selector: 'app-subsanacion',
  standalone: true,
  imports: [FormsModule, UIButtonComponent, UIModalComponent, InformeEvaluacionComponent],
  template: `
    <div class="mt-4 space-y-4">
      <section class="form-card-flat space-y-3">
        <h5 class="form-section-title">Observaciones de la UAJ · ronda {{ ronda() }}</h5>
        @if (cargando()) {
          <p class="text-xs text-slate-400">Cargando las observaciones…</p>
        } @else if (error()) {
          <p class="text-xs text-destructive">{{ error() }}</p>
        } @else {
          @for (o of pendientes(); track o.ideObservacion) {
            <div class="form-field">
              <p class="text-xs text-slate-700"><span class="font-semibold">{{ o.numOrden }}.</span> {{ o.txtObservacion }}</p>
              <label class="form-label" [attr.for]="'resp-' + o.ideObservacion">Respuesta <span class="form-label-required">*</span></label>
              <textarea [id]="'resp-' + o.ideObservacion" rows="2" class="form-textarea" [maxlength]="longitud"
                [ngModel]="respuestas()[o.ideObservacion] || ''" (ngModelChange)="responder(o.ideObservacion, $event)"></textarea>
            </div>
          } @empty {
            <p class="text-xs text-slate-400">No hay observaciones pendientes de responder.</p>
          }
        }
      </section>

      <div>
        <p class="mb-1 text-xs text-slate-600">Corrija el Informe de Evaluación según las observaciones y preséntelo firmado (versión nueva):</p>
        <app-informe-evaluacion [ideCierre]="ideCierre()" modo="subsanacion" (firmadoCambio)="informeFirmado.set($event)" />
      </div>

      <section class="form-card-flat space-y-3">
        <h5 class="form-section-title">Elevar de nuevo a la Dirección Ejecutiva</h5>
        <ul class="space-y-1 text-xs">
          <li [class.text-success]="todasRespondidas()" [class.text-slate-500]="!todasRespondidas()">
            {{ todasRespondidas() ? '✔' : '✖' }} Todas las observaciones de la ronda {{ ronda() }} respondidas
          </li>
          <li [class.text-success]="informeFirmado()" [class.text-slate-500]="!informeFirmado()">
            {{ informeFirmado() ? '✔' : '✖' }} Versión nueva del Informe de Evaluación presentada firmada
          </li>
        </ul>
        <ui-button icon="send" label="Subsanar y elevar a la DE" [disabled]="!puedeSubsanar()" (onClick)="confirmar.set(true)" />
      </section>
    </div>

    <app-ui-modal [visible]="confirmar()" title="Subsanar y elevar a la DE" subtitle="El expediente vuelve a la Dirección Ejecutiva."
      icon="send" maxWidth="460px" saveLabel="Elevar" saveIcon="send" [isSubmitting]="enviando()"
      (onHide)="confirmar.set(false)" (onSave)="subsanar()">
      <p class="text-sm text-foreground">Se registrarán las {{ pendientes().length }} respuestas y el expediente volverá a la DE, que lo trasladará otra vez a la UAJ.</p>
    </app-ui-modal>
  `
})
export class SubsanacionComponent {
  private api = inject(CierreApiService);
  private toast = inject(ToastService);

  ideCierre = input.required<number>();
  cambio = output<void>();

  readonly longitud = environment.revisionLegal.longitudRespuesta;

  cargando = signal(false);
  error = signal<string | null>(null);
  enviando = signal(false);
  confirmar = signal(false);
  observaciones = signal<ObservacionUajDto[]>([]);
  /** Respuesta por observación (`ideObservacion → texto`). */
  respuestas = signal<Record<number, string>>({});
  informeFirmado = signal(false);

  ronda = computed(() => ultimaRonda(this.observaciones()));
  pendientes = computed(() => pendientesDeSubsanar(this.observaciones()));
  todasRespondidas = computed(() => {
    const pendientes = this.pendientes();
    const respuestas = this.respuestas();
    return pendientes.length > 0 && pendientes.every(o => (respuestas[o.ideObservacion] ?? '').trim().length > 0);
  });
  puedeSubsanar = computed(() => this.todasRespondidas() && this.informeFirmado() && !this.enviando());

  constructor() {
    effect(() => {
      const id = this.ideCierre();
      untracked(() => this.cargar(id));
    });
  }

  cargar(id = this.ideCierre()) {
    this.cargando.set(true);
    this.error.set(null);
    this.api.listarObservaciones(id).subscribe({
      next: lista => {
        this.observaciones.set(lista);
        this.cargando.set(false);
      },
      error: err => {
        this.cargando.set(false);
        this.error.set(mensajeParaUsuario(err, 'No se pudieron cargar las observaciones de la UAJ.'));
      }
    });
  }

  responder(ideObservacion: number, texto: string) {
    this.respuestas.update(r => ({ ...r, [ideObservacion]: texto }));
  }

  subsanar() {
    if (!this.puedeSubsanar()) return;
    this.enviando.set(true);
    const respuestas = this.pendientes().map(o => ({ ideObservacion: o.ideObservacion, txtRespuesta: this.respuestas()[o.ideObservacion].trim() }));
    this.api.subsanar(this.ideCierre(), respuestas).subscribe({
      next: () => {
        this.enviando.set(false);
        this.confirmar.set(false);
        this.toast.success('Expediente subsanado', 'Volvió a la Dirección Ejecutiva.');
        this.cambio.emit();
      },
      error: err => {
        this.enviando.set(false);
        this.confirmar.set(false);
        this.toast.error('No se pudo subsanar', mensajeParaUsuario(err, 'Intente nuevamente.'));
      }
    });
  }
}

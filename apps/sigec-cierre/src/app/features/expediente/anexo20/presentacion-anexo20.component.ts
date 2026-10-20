import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ToastService, UIButtonComponent, UIModalComponent } from '@agroideas/ui';
import { mensajeParaUsuario } from '@agroideas/utils';
import { CierreApiService } from '../../../core/services/cierre-api.service';
import { Anexo20ResumenDto } from '../../../core/models/anexo20.model';
import { PlazoDto, diasRestantes } from '../../../core/models/plazo.model';
import { SelectorPdfComponent } from '../../../shared/selector-pdf.component';

/**
 * La UN presenta el Anexo 20 cuando el último RTF se envió sin él (`ESPERA_ANEXO20`, ADR 0013): la OA completa el
 * formulario en sigec-rtf, lo firma y entrega el PDF; la UN verifica que el formulario esté completo y lo carga aquí
 * (`POST /cierres/{id}/anexos20`). El expediente pasa a la verificación de campo. Vencido el plazo, la API lo rechaza
 * porque el proceso continúa de oficio.
 */
@Component({
  selector: 'app-presentacion-anexo20',
  standalone: true,
  imports: [DatePipe, UIButtonComponent, UIModalComponent, SelectorPdfComponent],
  template: `
    <section class="form-card-flat mt-4 space-y-4">
      <div>
        <h5 class="form-section-title">Presentar el Anexo 20 en nombre de la organización</h5>
        <p class="text-xs text-slate-600">
          El último RTF se envió sin el Informe de Cierre. La organización completa el formulario en el módulo de RTF, lo firma
          y le entrega el PDF; cárguelo aquí para continuar con la verificación de campo.
        </p>
      </div>

      @if (vencido()) {
        <p class="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
          El plazo venció el {{ plazo()?.fecLimite | date: 'dd/MM/yyyy' }}: el procedimiento continúa de oficio y ya no se presenta el Anexo 20.
        </p>
      } @else {
        <div class="rounded-lg border border-slate-200 p-3 text-xs">
          @if (cargando()) {
            <p class="text-slate-400">Consultando el formulario de la organización…</p>
          } @else if (errorFormulario()) {
            <p class="text-destructive">{{ errorFormulario() }}</p>
          } @else if (formularioCompleto()) {
            <p class="flex items-center gap-2 text-success">
              <span class="material-symbols-outlined text-[18px]">check_circle</span>
              La organización completó el formulario{{ anexo()?.numAnexo20 ? ' (N° ' + anexo()?.numAnexo20 + ')' : '' }}.
            </p>
            <ui-button class="mt-2 inline-block" icon="description" label="Ver el formulario sin firma" size="sm" appearance="soft"
              severity="secondary" [loading]="descargando()" [disabled]="descargando()" (onClick)="verFormulario()" />
          } @else {
            <p class="font-semibold text-warning">La organización aún no completa el formulario en el módulo de RTF.</p>
            @if ((anexo()?.faltantes ?? []).length) {
              <p class="mt-1 text-slate-600">Falta: {{ anexo()?.faltantes?.join('; ') }}.</p>
            }
          }
        </div>

        <app-selector-pdf etiqueta="Anexo 20 firmado por el representante legal" [deshabilitado]="!formularioCompleto()" [(archivo)]="firmado" />
        <ui-button icon="send" label="Presentar el Anexo 20" [disabled]="!formularioCompleto() || !firmado()" (onClick)="confirmar.set(true)" />
      }
    </section>

    <app-ui-modal [visible]="confirmar()" title="Presentar el Anexo 20" subtitle="En nombre de la organización agraria."
      icon="send" maxWidth="500px" saveLabel="Presentar" saveIcon="send" [isSubmitting]="enviando()"
      (onHide)="confirmar.set(false)" (onSave)="presentar()">
      <p class="text-sm text-foreground">
        Se registrará <span class="font-semibold">{{ firmado()?.name }}</span> como el Anexo 20 del expediente y este pasará a la
        verificación de campo. Después ya no se puede reemplazar.
      </p>
    </app-ui-modal>
  `
})
export class PresentacionAnexo20Component {
  private api = inject(CierreApiService);
  private toast = inject(ToastService);

  ideCierre = input.required<number>();
  ideConvenio = input.required<number>();
  /** Plazo del Anexo 20 (30 días): vencido, la API ya no acepta la presentación. */
  plazo = input<PlazoDto | null>(null);
  /** PDF sin firma, para que el expediente lo muestre en su visor. */
  ver = output<{ nombre: string; contenido: Blob }>();
  cambio = output<void>();

  cargando = signal(false);
  errorFormulario = signal<string | null>(null);
  anexo = signal<Anexo20ResumenDto | null>(null);
  descargando = signal(false);
  firmado = signal<File | null>(null);
  confirmar = signal(false);
  enviando = signal(false);

  formularioCompleto = computed(() => {
    const anexo = this.anexo();
    return !!anexo && anexo.ideAnexo20 > 0 && anexo.faltantes.length === 0;
  });
  vencido = computed(() => {
    const plazo = this.plazo();
    return !!plazo && plazo.estPlazo === 'VIGENTE' && diasRestantes(plazo.fecLimite) < 0;
  });

  constructor() {
    effect(() => {
      const ideConvenio = this.ideConvenio();
      untracked(() => this.cargar(ideConvenio));
    });
  }

  cargar(ideConvenio = this.ideConvenio()) {
    this.cargando.set(true);
    this.errorFormulario.set(null);
    this.api.obtenerAnexo20(ideConvenio).subscribe({
      next: anexo => {
        this.anexo.set(anexo);
        this.cargando.set(false);
      },
      error: err => {
        this.cargando.set(false);
        this.errorFormulario.set(mensajeParaUsuario(err, 'No se pudo consultar el formulario del Anexo 20.'));
      }
    });
  }

  verFormulario() {
    this.descargando.set(true);
    this.api.descargarFormularioAnexo20(this.ideConvenio()).subscribe({
      next: blob => {
        this.descargando.set(false);
        this.ver.emit({ nombre: `Anexo20_${this.anexo()?.numAnexo20 ?? this.ideConvenio()}_sin_firma.pdf`, contenido: blob });
      },
      error: err => {
        this.descargando.set(false);
        this.toast.error('No se pudo generar el formulario', mensajeParaUsuario(err, 'Intente nuevamente.'));
      }
    });
  }

  presentar() {
    const firmado = this.firmado();
    if (!firmado || !this.formularioCompleto()) return;
    this.enviando.set(true);
    this.api.presentarAnexo20(this.ideCierre(), firmado).subscribe({
      next: () => {
        this.enviando.set(false);
        this.confirmar.set(false);
        this.toast.success('Anexo 20 presentado', 'El expediente pasó a la verificación de campo.');
        this.cambio.emit();
      },
      error: err => {
        this.enviando.set(false);
        this.confirmar.set(false);
        this.toast.error('No se pudo presentar el Anexo 20', mensajeParaUsuario(err, 'Intente nuevamente.'));
      }
    });
  }
}

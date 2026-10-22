import { Component, inject, input, output, signal } from '@angular/core';
import { ToastService, UIButtonComponent } from '@agroideas/ui';
import { mensajeParaUsuario } from '@agroideas/utils';
import { CierreApiService } from '../../../core/services/cierre-api.service';
import { SelectorPdfComponent } from '../../../shared/selector-pdf.component';

/**
 * Cargo de la entrega física de la RDE en el domicilio legal de la OA (ADR-001 D4), ADR 0013 Fase 4. Lo registra la
 * DE con el expediente CERRADO; no cambia el estado. Un cargo nuevo reemplaza al anterior (queda como historial).
 */
@Component({
  selector: 'app-cargo-notificacion',
  standalone: true,
  host: { class: 'block' },
  imports: [UIButtonComponent, SelectorPdfComponent],
  template: `
    <section class="form-card-flat mt-4 space-y-3">
      <h5 class="form-section-title">Cargo de notificación de la RDE</h5>
      <p class="text-xs text-muted-foreground">
        @if (registrado()) { Ya hay un cargo registrado; si carga otro, reemplazará al anterior. }
        @else { Registre el cargo de la entrega de la RDE en el domicilio legal de la organización. }
      </p>
      <app-selector-pdf etiqueta="Cargo de notificación" [(archivo)]="cargo" />
      <ui-button icon="upload" label="Registrar cargo" [loading]="enviando()" [disabled]="!cargo() || enviando()" (onClick)="registrar()" />
    </section>
  `
})
export class CargoNotificacionComponent {
  private api = inject(CierreApiService);
  private toast = inject(ToastService);

  ideCierre = input.required<number>();
  /** Ya existe un cargo vigente. */
  registrado = input(false);
  cambio = output<void>();

  cargo = signal<File | null>(null);
  enviando = signal(false);

  registrar() {
    const cargo = this.cargo();
    if (!cargo) return;
    this.enviando.set(true);
    this.api.registrarCargoNotificacion(this.ideCierre(), cargo).subscribe({
      next: () => {
        this.enviando.set(false);
        this.cargo.set(null);
        this.toast.success('Cargo registrado', 'Se agregó a los documentos del expediente.');
        this.cambio.emit();
      },
      error: err => {
        this.enviando.set(false);
        this.toast.error('No se pudo registrar el cargo', mensajeParaUsuario(err, 'Intente nuevamente.'));
      }
    });
  }
}

import { Component, OnInit, inject, signal } from '@angular/core';
import { UIButtonComponent, UiStateComponent } from '@agroideas/ui';
import { mensajeParaUsuario } from '@agroideas/utils';
import { CierreApiService } from '../../core/services/cierre-api.service';
import { ExpedienteComponent } from '../expediente/expediente.component';

/**
 * Expediente de la OA, en solo lectura. `GET /cierres` ya limita a la OA a su convenio, así que
 * basta el primer resultado. La OA no presenta nada aquí: el Anexo 20 va con el último RTF en
 * sigec-rtf (ADR 0013, D1).
 */
@Component({
  selector: 'app-mi-cierre',
  standalone: true,
  host: { class: 'block' },
  imports: [UIButtonComponent, ExpedienteComponent, UiStateComponent],
  template: `
    <div class="space-y-6">
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-foreground">Mi cierre de convenio</h2>
        <p class="text-sm text-muted-foreground">Estado del expediente de cierre de su convenio.</p>
      </div>

      @if (cargando()) {
        <ui-state kind="loading" message="Buscando su expediente…" framed />
      } @else if (error()) {
        <ui-state kind="error" [message]="error() ?? ''" framed (retry)="cargar()" />
      } @else if (ideCierre() !== null) {
        <app-expediente [id]="ideCierre()!" [mostrarVolver]="false" />
      } @else {
        <ui-state
          kind="empty"
          icon="assignment"
          message="Su expediente de cierre se abre al enviar el RTF del último paso crítico."
          detail="El Informe de Cierre del PNT (Anexo 20) se presenta junto con ese RTF en el módulo de Reporte Técnico Financiero."
          framed
        />
      }
    </div>
  `
})
export class MiCierreComponent implements OnInit {
  private api = inject(CierreApiService);

  cargando = signal(true);
  error = signal<string | null>(null);
  ideCierre = signal<number | null>(null);

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    this.error.set(null);
    this.api.listar({ pagina: 1, cantidad: 1 }).subscribe({
      next: datos => {
        this.ideCierre.set(datos.items[0]?.ideCierreConvenio ?? null);
        this.cargando.set(false);
      },
      error: err => {
        this.error.set(mensajeParaUsuario(err, 'No se pudo consultar su expediente de cierre.'));
        this.cargando.set(false);
      }
    });
  }
}

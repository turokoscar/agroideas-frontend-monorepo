import { Component, OnInit, inject, signal } from '@angular/core';
import { UIButtonComponent } from '@agroideas/ui';
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
  imports: [UIButtonComponent, ExpedienteComponent],
  template: `
    <div class="space-y-6">
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-foreground">Mi cierre de convenio</h2>
        <p class="text-sm text-muted-foreground">Estado del expediente de cierre de su convenio.</p>
      </div>

      @if (cargando()) {
        <div class="flex items-center justify-center gap-2 rounded-xl border border-border bg-card p-12 text-sm text-muted-foreground">
          <span class="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
          Buscando su expediente…
        </div>
      } @else if (error()) {
        <div class="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-10 text-center">
          <p class="text-sm font-medium text-foreground">{{ error() }}</p>
          <ui-button label="Reintentar" icon="refresh" appearance="soft" severity="secondary" (onClick)="cargar()" />
        </div>
      } @else if (ideCierre() !== null) {
        <app-expediente [id]="ideCierre()!" [mostrarVolver]="false" />
      } @else {
        <div class="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <span class="material-symbols-outlined text-[40px] text-muted-foreground">assignment</span>
          <p class="text-sm font-medium text-foreground">Su expediente de cierre se abre al enviar el RTF del último paso crítico.</p>
          <p class="text-xs text-muted-foreground">
            El Informe de Cierre del PNT (Anexo 20) se presenta junto con ese RTF en el módulo de Reporte Técnico Financiero.
          </p>
        </div>
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

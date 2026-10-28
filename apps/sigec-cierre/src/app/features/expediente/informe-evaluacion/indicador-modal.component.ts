import { Component, computed, effect, input, output, signal } from '@angular/core';
import { DecimalPipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UIModalComponent } from '@agroideas/ui';
import { IndicadorEvaluacionDto, ejecutadoCierre, esCritica, variacion } from '../../../core/models/anexo22.model';
import { ColumnaExtra } from './tabla-indicadores.component';
import { CampoInvalidoDirective } from '../../../shared/campo-invalido.directive';
import { ErrorCampoComponent } from '../../../shared/error-campo.component';
import { CrecerDirective } from '../../../shared/crecer.directive';
import { environment } from '../../../../environments/environment';

/**
 * Alta y edición de un indicador del Anexo 22 en un modal, en lugar de editarlo en la tabla (que no cabe en
 * pantallas angostas). `soloTextos`: fila del sistema de la sección VI, de la que la UN solo escribe la actividad
 * y los comentarios. Trabaja sobre la copia que recibe: el padre la reemplaza al guardar.
 */
@Component({
  selector: 'app-indicador-modal',
  standalone: true,
  host: { class: 'block' },
  imports: [DecimalPipe, NgClass, FormsModule, UIModalComponent, CampoInvalidoDirective, CrecerDirective, ErrorCampoComponent],
  template: `
    <app-ui-modal
      [visible]="!!fila()"
      [title]="titulo()"
      [subtitle]="soloTextos() ? 'El indicador viene del SEL: solo se registran la actividad y los comentarios.' : seccion()"
      icon="query_stats"
      maxWidth="760px"
      saveLabel="Aceptar"
      saveIcon="check"
      (onHide)="cerrar.emit()"
      (onSave)="aceptar()"
    >
      @if (fila(); as f) {
        @let unidad = f.txtUnidadMedida ? ' (' + f.txtUnidadMedida + ')' : '';
        <div class="space-y-5">
          <!-- Qué se mide -->
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div class="form-field sm:col-span-3">
              <label class="form-label" for="ind-concepto">Indicador / concepto <span class="form-label-required">*</span></label>
              <input id="ind-concepto" [appInvalido]="errorConcepto()" type="text" maxlength="500" class="form-input" [disabled]="soloTextos()" [(ngModel)]="f.txtConcepto" />
              <app-error-campo para="ind-concepto" [mensaje]="errorConcepto()" />
            </div>
            @switch (columnaExtra()) {
              @case ('destino') {
                <div class="form-field sm:col-span-3">
                  <label class="form-label" for="ind-destino">Destino</label>
                  <input id="ind-destino" type="text" maxlength="250" class="form-input" [(ngModel)]="f.txtDestino" />
                </div>
              }
              @case ('objetivo') {
                <div class="form-field sm:col-span-3">
                  <label class="form-label" for="ind-objetivo">Objetivo específico</label>
                  <input id="ind-objetivo" type="text" maxlength="500" class="form-input" [(ngModel)]="f.txtObjetivoEspecifico" />
                </div>
              }
              @case ('actividad') {
                <div class="form-field sm:col-span-3">
                  <label class="form-label" for="ind-actividad">Actividad desarrollada</label>
                  <textarea id="ind-actividad" appCrecer rows="2" maxlength="500" class="form-textarea" [(ngModel)]="f.txtActividad"></textarea>
                </div>
              }
            }
            <!-- Unidad, línea base y resultado en una fila (ADR 0015) -->
            <div class="form-field">
              <label class="form-label" for="ind-unidad">Unidad de medida</label>
              @if (unidadesMedida().length > 0 && !soloTextos()) {
                <select id="ind-unidad" class="form-select" aria-describedby="ind-unidad-ayuda" [(ngModel)]="f.txtUnidadMedida">
                  <option [ngValue]="null">Seleccione una unidad…</option>
                  @for (u of unidadesMedida(); track u) { <option [ngValue]="u">{{ u }}</option> }
                </select>
                <span id="ind-unidad-ayuda" class="text-[11px] text-muted-foreground">Del catálogo del SEL.</span>
              } @else {
                <input id="ind-unidad" type="text" maxlength="50" class="form-input" [disabled]="soloTextos()" [(ngModel)]="f.txtUnidadMedida" />
              }
            </div>
            <div class="form-field">
              <label class="form-label" for="ind-lb">Línea base</label>
              <input id="ind-lb" type="number" class="form-input text-right" [disabled]="soloTextos()" [(ngModel)]="f.numLineaBase" />
            </div>
            <div class="form-field">
              <label class="form-label" for="ind-resultado">Resultado al cierre</label>
              <input id="ind-resultado" type="number" class="form-input text-right" [disabled]="soloTextos()" [(ngModel)]="f.numResultado" />
            </div>
          </div>

          <!-- Programado y ejecutado por año -->
          <div class="space-y-2">
            <p class="form-section-title">Programación y ejecución por año</p>
            <div class="overflow-hidden rounded-lg border border-border">
              <table class="w-full border-collapse text-left text-xs">
                <thead class="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th scope="col" class="w-20 px-3 py-2 font-semibold">Año</th>
                    <th scope="col" class="px-3 py-2 text-right font-semibold">Programado{{ unidad }}</th>
                    <th scope="col" class="px-3 py-2 text-right font-semibold">Ejecutado{{ unidad }}</th>
                    <th scope="col" class="w-32 px-3 py-2 text-right font-semibold">Variación</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border/60">
                  @for (anio of anios; track anio.n) {
                    @let v = pct(f[anio.prog], f[anio.ejec]);
                    <tr class="transition-colors hover:bg-muted/20">
                      <th scope="row" class="px-3 py-2 font-semibold text-foreground">
                        <span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[11px] text-primary">{{ anio.n }}</span>
                        <span class="sr-only">Año {{ anio.n }}</span>
                      </th>
                      <td class="px-3 py-2"><input type="number" class="form-input h-9 text-right" [attr.aria-label]="'Programado año ' + anio.n" [disabled]="soloTextos()" [(ngModel)]="f[anio.prog]" /></td>
                      <td class="px-3 py-2"><input type="number" class="form-input h-9 text-right" [attr.aria-label]="'Ejecutado año ' + anio.n" [disabled]="soloTextos()" [(ngModel)]="f[anio.ejec]" /></td>
                      <td class="px-3 py-2 text-right">
                        @if (v !== null) {
                          <span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold"
                            [ngClass]="critica(v) ? 'bg-destructive/10 text-destructive' : v < 0 ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'">
                            <span class="material-symbols-outlined text-[14px]" aria-hidden="true">{{ v < 0 ? 'trending_down' : 'trending_up' }}</span>
                            {{ v | number: '1.0-2' }} %
                          </span>
                        } @else { <span class="text-muted-foreground/60" title="Complete programado y ejecutado">—</span> }
                      </td>
                    </tr>
                  }
                </tbody>
                <tfoot class="border-t border-border bg-muted/30">
                  <tr>
                    <td colspan="3" class="px-3 py-2 text-muted-foreground">Ejecutado al cierre frente a la línea base</td>
                    <td class="px-3 py-2 text-right font-semibold" [ngClass]="(pctLineaBase() ?? 0) < 0 ? 'text-warning' : 'text-foreground'">
                      {{ pctLineaBase() !== null ? (pctLineaBase() | number: '1.0-2') + ' %' : '—' }}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p class="text-[11px] text-muted-foreground">La variación se resalta en rojo cuando cae {{ -umbral }} % o más frente a lo programado.</p>
          </div>

          <!-- Sustento: uno debajo del otro -->
          <div class="space-y-4">
            <div class="form-field">
              <label class="form-label" for="ind-medio">Medio de verificación</label>
              <textarea id="ind-medio" appCrecer rows="2" maxlength="500" class="form-textarea" [disabled]="soloTextos()" [(ngModel)]="f.txtMedioVerificacion"></textarea>
            </div>
            <div class="form-field">
              <label class="form-label" for="ind-comentarios">Comentarios</label>
              <textarea id="ind-comentarios" appCrecer rows="2" maxlength="500" class="form-textarea" [(ngModel)]="f.txtComentarios"></textarea>
            </div>
          </div>
        </div>
      }
    </app-ui-modal>
  `
})
export class IndicadorModalComponent {
  /** Copia de la fila que se edita; null cierra el modal. */
  fila = input<IndicadorEvaluacionDto | null>(null);
  seccion = input('');
  columnaExtra = input<ColumnaExtra>(null);
  soloTextos = input(false);
  /** Es una fila nueva (cambia el título). */
  nueva = input(false);
  /** Catálogo de unidades de medida del SEL; vacío: la unidad se escribe. */
  unidadesMedida = input<string[]>([]);
  guardar = output<IndicadorEvaluacionDto>();
  cerrar = output<void>();

  readonly anios = [
    { n: 1, prog: 'numProgAnio1', ejec: 'numEjecAnio1' },
    { n: 2, prog: 'numProgAnio2', ejec: 'numEjecAnio2' },
    { n: 3, prog: 'numProgAnio3', ejec: 'numEjecAnio3' }
  ] as const;

  readonly pct = variacion;
  readonly umbral = environment.evaluacion.umbralDesviacionCriticaPct;
  readonly critica = (v: number | null) => esCritica(v);

  titulo = computed(() => (this.nueva() ? 'Agregar indicador' : 'Editar indicador'));

  /** Los errores se marcan recién al intentar aceptar, como en el resto del formulario. */
  intento = signal(false);

  constructor() {
    // Angular 18 exige permitir escribir una señal desde un effect (NG0600).
    effect(
      () => {
        this.fila();
        this.intento.set(false);
      },
      { allowSignalWrites: true }
    );
  }

  errorConcepto(): string | null {
    return this.intento() && !this.valido() ? 'Indique el indicador o concepto.' : null;
  }

  aceptar() {
    const fila = this.fila();
    if (!fila) return;
    if (!this.valido()) {
      this.intento.set(true);
      document.getElementById('ind-concepto')?.focus();
      return;
    }
    this.guardar.emit(fila);
  }

  /** Método (no computed): el concepto se edita mutando la copia, que no es una señal. */
  valido(): boolean {
    return this.soloTextos() || !!this.fila()?.txtConcepto?.trim();
  }

  pctLineaBase(): number | null {
    const f = this.fila();
    return f ? variacion(f.numLineaBase, ejecutadoCierre(f)) : null;
  }
}

import { Component, computed, input, output } from '@angular/core';
import { DecimalPipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UIModalComponent } from '@agroideas/ui';
import { IndicadorEvaluacionDto, ejecutadoCierre, esCritica, variacion } from '../../../core/models/anexo22.model';
import { ColumnaExtra } from './tabla-indicadores.component';

/**
 * Alta y edición de un indicador del Anexo 22 en un modal, en lugar de editarlo en la tabla (que no cabe en
 * pantallas angostas). `soloTextos`: fila del sistema de la sección VI, de la que la UN solo escribe la actividad
 * y los comentarios. Trabaja sobre la copia que recibe: el padre la reemplaza al guardar.
 */
@Component({
  selector: 'app-indicador-modal',
  standalone: true,
  host: { class: 'block' },
  imports: [DecimalPipe, NgClass, FormsModule, UIModalComponent],
  template: `
    <app-ui-modal
      [visible]="!!fila()"
      [title]="titulo()"
      [subtitle]="soloTextos() ? 'El indicador viene del SEL: solo se registran la actividad y los comentarios.' : seccion()"
      icon="query_stats"
      maxWidth="760px"
      saveLabel="Aceptar"
      saveIcon="check"
      [saveDisabled]="!valido()"
      (onHide)="cerrar.emit()"
      (onSave)="guardar.emit(fila()!)"
    >
      @if (fila(); as f) {
        <div class="space-y-5">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="form-field sm:col-span-2">
              <label class="form-label" for="ind-concepto">Indicador / concepto <span class="form-label-required">*</span></label>
              <input id="ind-concepto" [attr.aria-describedby]="valido() ? null : 'ind-concepto-ayuda'" type="text" maxlength="500" class="form-input" [disabled]="soloTextos()" [(ngModel)]="f.txtConcepto" />
              @if (!valido()) {
                <span id="ind-concepto-ayuda" class="text-[11px] text-muted-foreground">Obligatorio: sin él no se puede guardar el indicador.</span>
              }
            </div>
            <div class="form-field">
              <label class="form-label" for="ind-unidad">Unidad de medida</label>
              <input id="ind-unidad" type="text" maxlength="50" class="form-input" [disabled]="soloTextos()" [(ngModel)]="f.txtUnidadMedida" />
            </div>
            @switch (columnaExtra()) {
              @case ('destino') {
                <div class="form-field">
                  <label class="form-label" for="ind-destino">Destino</label>
                  <input id="ind-destino" type="text" maxlength="250" class="form-input" [(ngModel)]="f.txtDestino" />
                </div>
              }
              @case ('objetivo') {
                <div class="form-field">
                  <label class="form-label" for="ind-objetivo">Objetivo específico</label>
                  <input id="ind-objetivo" type="text" maxlength="500" class="form-input" [(ngModel)]="f.txtObjetivoEspecifico" />
                </div>
              }
              @case ('actividad') {
                <div class="form-field">
                  <label class="form-label" for="ind-actividad">Actividad desarrollada</label>
                  <input id="ind-actividad" type="text" maxlength="500" class="form-input" [(ngModel)]="f.txtActividad" />
                </div>
              }
            }
          </div>

          <div class="space-y-2">
            <p class="form-section-title mb-2">Valores</p>
            <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div class="form-field">
                <label class="form-label" for="ind-lb">Línea base</label>
                <input id="ind-lb" type="number" class="form-input text-right" [disabled]="soloTextos()" [(ngModel)]="f.numLineaBase" />
              </div>
              <div class="form-field">
                <label class="form-label" for="ind-resultado">Resultado al cierre</label>
                <input id="ind-resultado" type="number" class="form-input text-right" [disabled]="soloTextos()" [(ngModel)]="f.numResultado" />
              </div>
            </div>
            <div class="overflow-x-auto rounded-lg border border-border/60">
              <table class="w-full min-w-[420px] border-collapse text-left text-xs">
                <thead class="border-b border-border/60 bg-muted/40 text-muted-foreground">
                  <tr><th class="p-2.5">Año</th><th class="p-2.5">Programado</th><th class="p-2.5">Ejecutado</th><th class="p-2.5 text-right">Variación</th></tr>
                </thead>
                <tbody>
                  @for (anio of anios; track anio.n) {
                    <tr class="border-b border-border/40">
                      <td class="p-2.5 font-semibold text-muted-foreground">Año {{ anio.n }}</td>
                      <td class="p-2.5"><input type="number" class="form-input text-right" [attr.aria-label]="'Programado año ' + anio.n" [disabled]="soloTextos()" [(ngModel)]="f[anio.prog]" /></td>
                      <td class="p-2.5"><input type="number" class="form-input text-right" [attr.aria-label]="'Ejecutado año ' + anio.n" [disabled]="soloTextos()" [(ngModel)]="f[anio.ejec]" /></td>
                      <td class="p-2.5 text-right">
                        @if (pct(f[anio.prog], f[anio.ejec]) !== null) {
                          <span [ngClass]="critica(pct(f[anio.prog], f[anio.ejec])) ? 'font-semibold text-destructive' : 'text-muted-foreground'">
                            {{ pct(f[anio.prog], f[anio.ejec]) | number: '1.0-2' }} %
                          </span>
                        } @else { <span class="text-muted-foreground/50">—</span> }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            @if (pctLineaBase() !== null) {
              <p class="text-[11px] text-muted-foreground">Ejecutado al cierre frente a la línea base: {{ pctLineaBase() | number: '1.0-2' }} %</p>
            }
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="form-field">
              <label class="form-label" for="ind-medio">Medio de verificación</label>
              <input id="ind-medio" type="text" maxlength="500" class="form-input" [disabled]="soloTextos()" [(ngModel)]="f.txtMedioVerificacion" />
            </div>
            <div class="form-field">
              <label class="form-label" for="ind-comentarios">Comentarios</label>
              <input id="ind-comentarios" type="text" maxlength="500" class="form-input" [(ngModel)]="f.txtComentarios" />
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
  guardar = output<IndicadorEvaluacionDto>();
  cerrar = output<void>();

  readonly anios = [
    { n: 1, prog: 'numProgAnio1', ejec: 'numEjecAnio1' },
    { n: 2, prog: 'numProgAnio2', ejec: 'numEjecAnio2' },
    { n: 3, prog: 'numProgAnio3', ejec: 'numEjecAnio3' }
  ] as const;

  readonly pct = variacion;
  readonly critica = (v: number | null) => esCritica(v);

  titulo = computed(() => (this.nueva() ? 'Agregar indicador' : 'Editar indicador'));

  /** Método (no computed): el concepto se edita mutando la copia, que no es una señal. */
  valido(): boolean {
    return this.soloTextos() || !!this.fila()?.txtConcepto?.trim();
  }

  pctLineaBase(): number | null {
    const f = this.fila();
    return f ? variacion(f.numLineaBase, ejecutadoCierre(f)) : null;
  }
}

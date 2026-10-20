import { Component, input, output } from '@angular/core';
import { DecimalPipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UIButtonComponent } from '@agroideas/ui';
import {
  ETIQUETA_ORIGEN_DATO,
  IndicadorEvaluacionDto,
  ejecutadoCierre,
  esCritica,
  tieneDesviacionCritica,
  variacion
} from '../../../core/models/anexo22.model';

/** Columna propia de cada sección del Anexo 22 (2.3 destino, III objetivo, VI actividad). */
export type ColumnaExtra = 'destino' | 'objetivo' | 'actividad' | null;

/**
 * Tabla de indicadores del Anexo 22: línea base, programado y ejecutado por año, resultado y variaciones. Las
 * filas del sistema (SEL, RTF, KOFIX) son de solo lectura; las manuales se editan completas; en la sección VI se
 * editan la actividad y los comentarios también de las filas del sistema (`ComposicionAnexo22`). Las variaciones
 * se calculan en vivo y se resaltan si caen por debajo del umbral crítico.
 */
@Component({
  selector: 'app-tabla-indicadores',
  standalone: true,
  imports: [DecimalPipe, NgClass, FormsModule, UIButtonComponent],
  template: `
    <div class="overflow-x-auto rounded-lg border border-slate-200">
      <table class="w-full min-w-[1100px] border-collapse text-left text-xs">
        <thead class="border-b border-slate-200 bg-slate-50 text-slate-500">
          <tr>
            <th rowspan="2" class="w-8 p-2">N°</th>
            <th rowspan="2" class="p-2">Concepto</th>
            <th rowspan="2" class="p-2">Unidad</th>
            @if (columnaExtra()) { <th rowspan="2" class="p-2">{{ tituloExtra() }}</th> }
            <th rowspan="2" class="p-2 text-right">Línea base</th>
            @for (anio of [1, 2, 3]; track anio) {
              <th colspan="2" class="border-l border-slate-200 p-2 text-center">Año {{ anio }}</th>
            }
            <th rowspan="2" class="border-l border-slate-200 p-2 text-right">Resultado</th>
            <th rowspan="2" class="p-2 text-right" title="Ejecutado al cierre frente a la línea base">Var. vs LB</th>
            <th rowspan="2" class="p-2">Origen</th>
            <th rowspan="2" class="p-2">Comentarios</th>
            <th rowspan="2" class="w-10 p-2"></th>
          </tr>
          <tr>
            @for (anio of [1, 2, 3]; track anio) {
              <th class="border-l border-slate-200 p-2 text-right">Prog.</th>
              <th class="p-2 text-right">Ejec.</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (f of filas(); track $index) {
            @let editable = !soloLectura() && f.txtOrigen === 'MANUAL';
            <tr class="border-b border-slate-100 align-top" [ngClass]="{ 'bg-destructive/5': critica(f) }">
              <td class="p-2 font-semibold text-slate-500">{{ f.numOrden }}</td>
              <td class="p-2">
                @if (editable) {
                  <input type="text" maxlength="500" class="form-input" [attr.aria-label]="'Concepto ' + f.numOrden" [(ngModel)]="f.txtConcepto" (ngModelChange)="cambio.emit()" />
                } @else { <span class="font-semibold text-slate-800">{{ f.txtConcepto }}</span> }
              </td>
              <td class="p-2">
                @if (editable) {
                  <input type="text" maxlength="50" class="form-input w-24" [attr.aria-label]="'Unidad ' + f.numOrden" [(ngModel)]="f.txtUnidadMedida" (ngModelChange)="cambio.emit()" />
                } @else { {{ f.txtUnidadMedida ?? '—' }} }
              </td>
              @if (columnaExtra()) {
                <td class="p-2">
                  @switch (columnaExtra()) {
                    @case ('destino') {
                      @if (editable) { <input type="text" maxlength="250" class="form-input" [attr.aria-label]="'Destino ' + f.numOrden" [(ngModel)]="f.txtDestino" (ngModelChange)="cambio.emit()" /> }
                      @else { {{ f.txtDestino ?? '—' }} }
                    }
                    @case ('objetivo') {
                      @if (editable) { <input type="text" maxlength="500" class="form-input" [attr.aria-label]="'Objetivo específico ' + f.numOrden" [(ngModel)]="f.txtObjetivoEspecifico" (ngModelChange)="cambio.emit()" /> }
                      @else { {{ f.txtObjetivoEspecifico ?? '—' }} }
                    }
                    @case ('actividad') {
                      @if (!soloLectura()) { <input type="text" maxlength="500" class="form-input" [attr.aria-label]="'Actividad ' + f.numOrden" [(ngModel)]="f.txtActividad" (ngModelChange)="cambio.emit()" /> }
                      @else { {{ f.txtActividad ?? '—' }} }
                    }
                  }
                </td>
              }
              <td class="p-2 text-right">
                @if (editable) { <input type="number" class="form-input w-24 text-right" [attr.aria-label]="'Línea base ' + f.numOrden" [(ngModel)]="f.numLineaBase" (ngModelChange)="cambio.emit()" /> }
                @else { {{ numero(f.numLineaBase) }} }
              </td>
              @for (anio of anios; track anio.prog) {
                <td class="border-l border-slate-100 p-2 text-right">
                  @if (editable) { <input type="number" class="form-input w-20 text-right" [attr.aria-label]="'Programado año ' + anio.n + ' ' + f.numOrden" [(ngModel)]="f[anio.prog]" (ngModelChange)="cambio.emit()" /> }
                  @else { {{ numero(f[anio.prog]) }} }
                </td>
                <td class="p-2 text-right">
                  @if (editable) { <input type="number" class="form-input w-20 text-right" [attr.aria-label]="'Ejecutado año ' + anio.n + ' ' + f.numOrden" [(ngModel)]="f[anio.ejec]" (ngModelChange)="cambio.emit()" /> }
                  @else { {{ numero(f[anio.ejec]) }} }
                  @if (pct(f[anio.prog], f[anio.ejec]); as v) {
                    <span class="block text-[10px]" [ngClass]="esCritica(v) ? 'font-semibold text-destructive' : 'text-slate-400'">{{ v > 0 ? '+' : '' }}{{ v | number: '1.0-2' }} %</span>
                  }
                </td>
              }
              <td class="border-l border-slate-100 p-2 text-right">
                @if (editable) { <input type="number" class="form-input w-24 text-right" [attr.aria-label]="'Resultado ' + f.numOrden" [(ngModel)]="f.numResultado" (ngModelChange)="cambio.emit()" /> }
                @else { {{ numero(f.numResultado) }} }
              </td>
              <td class="p-2 text-right">
                @if (pctLineaBase(f); as v) {
                  <span [ngClass]="v < 0 ? 'text-warning' : 'text-success'">{{ v > 0 ? '+' : '' }}{{ v | number: '1.0-2' }} %</span>
                } @else { <span class="text-slate-400">—</span> }
              </td>
              <td class="p-2">
                <span class="whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                  [ngClass]="f.txtOrigen === 'MANUAL' ? 'border-slate-200 bg-slate-50 text-slate-500' : 'border-primary/30 bg-primary/10 text-primary'">
                  {{ origen(f.txtOrigen) }}
                </span>
              </td>
              <td class="p-2">
                @if (!soloLectura() && (editable || columnaExtra() === 'actividad')) {
                  <input type="text" maxlength="500" class="form-input" [attr.aria-label]="'Comentarios ' + f.numOrden" [(ngModel)]="f.txtComentarios" (ngModelChange)="cambio.emit()" />
                } @else { {{ f.txtComentarios ?? '' }} }
              </td>
              <td class="p-2 text-right">
                @if (editable) {
                  <ui-button iconOnly size="sm" appearance="soft" severity="danger" icon="delete" [ariaLabel]="'Quitar la fila ' + f.numOrden" (onClick)="quitar.emit($index)" />
                }
              </td>
            </tr>
          } @empty {
            <tr><td [attr.colspan]="columnaExtra() ? 16 : 15" class="p-4 text-center text-slate-400">{{ vacio() }}</td></tr>
          }
        </tbody>
      </table>
    </div>
  `
})
export class TablaIndicadoresComponent {
  filas = input.required<IndicadorEvaluacionDto[]>();
  columnaExtra = input<ColumnaExtra>(null);
  soloLectura = input(false);
  vacio = input('Sin indicadores.');
  cambio = output<void>();
  quitar = output<number>();

  readonly anios = [
    { n: 1, prog: 'numProgAnio1', ejec: 'numEjecAnio1' },
    { n: 2, prog: 'numProgAnio2', ejec: 'numEjecAnio2' },
    { n: 3, prog: 'numProgAnio3', ejec: 'numEjecAnio3' }
  ] as const;

  readonly esCritica = (v: number | null) => esCritica(v);
  readonly pct = variacion;

  tituloExtra(): string {
    switch (this.columnaExtra()) {
      case 'destino': return 'Destino';
      case 'objetivo': return 'Objetivo específico';
      case 'actividad': return 'Actividad';
      default: return '';
    }
  }

  critica(f: IndicadorEvaluacionDto): boolean {
    return tieneDesviacionCritica(f);
  }

  pctLineaBase(f: IndicadorEvaluacionDto): number | null {
    return variacion(f.numLineaBase, ejecutadoCierre(f));
  }

  origen(origen: string): string {
    return ETIQUETA_ORIGEN_DATO[origen] ?? origen;
  }

  numero(v: number | null | undefined): string {
    return v == null ? '—' : v.toLocaleString('es-PE', { maximumFractionDigits: 2 });
  }
}

import { Component, input, output } from '@angular/core';
import { DecimalPipe, NgClass } from '@angular/common';
import { UIButtonComponent, UiStatusPillComponent } from '@agroideas/ui';
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
 * Tabla de indicadores del Anexo 22, de solo lectura: línea base, programado y ejecutado por año, resultado y
 * variaciones (resaltadas si caen por debajo del umbral crítico). La edición va en `IndicadorModalComponent`: la
 * tabla es muy ancha para editar en línea. Se editan las filas manuales y, en la sección VI, la actividad y los
 * comentarios de las filas del sistema; solo las manuales se pueden quitar.
 */
@Component({
  selector: 'app-tabla-indicadores',
  standalone: true,
  host: { class: 'block' },
  imports: [DecimalPipe, NgClass, UIButtonComponent, UiStatusPillComponent],
  template: `
    <div class="overflow-x-auto rounded-lg border border-slate-200">
      <table class="w-full min-w-[980px] border-collapse text-left text-xs">
        <thead class="border-b border-slate-200 bg-slate-50 text-slate-500">
          <tr>
            <th rowspan="2" class="w-8 p-2">N°</th>
            <th rowspan="2" class="p-2">Concepto</th>
            <th rowspan="2" class="p-2">Unidad</th>
            @if (columnaExtra()) { <th rowspan="2" class="p-2">{{ tituloExtra() }}</th> }
            <th rowspan="2" class="p-2 text-right">Línea base</th>
            @for (anio of anios; track anio.n) {
              <th colspan="2" class="border-l border-slate-200 p-2 text-center">Año {{ anio.n }}</th>
            }
            <th rowspan="2" class="border-l border-slate-200 p-2 text-right">Resultado</th>
            <th rowspan="2" class="p-2 text-right" title="Ejecutado al cierre frente a la línea base">Var. vs LB</th>
            <th rowspan="2" class="p-2">Origen</th>
            <th rowspan="2" class="w-20 p-2"></th>
          </tr>
          <tr>
            @for (anio of anios; track anio.n) {
              <th class="border-l border-slate-200 p-2 text-right">Prog.</th>
              <th class="p-2 text-right">Ejec.</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (f of filas(); track $index) {
            @let manual = f.txtOrigen === 'MANUAL';
            <tr class="border-b border-slate-100 align-top" [ngClass]="{ 'bg-destructive/5': critica(f) }">
              <td class="p-2 font-semibold text-slate-500">{{ f.numOrden }}</td>
              <td class="p-2">
                <span class="font-semibold text-slate-800">{{ f.txtConcepto || '(sin concepto)' }}</span>
                @if (f.txtComentarios) { <span class="block text-[10px] text-slate-400">{{ f.txtComentarios }}</span> }
              </td>
              <td class="p-2">{{ f.txtUnidadMedida ?? '—' }}</td>
              @if (columnaExtra()) { <td class="p-2">{{ extra(f) ?? '—' }}</td> }
              <td class="p-2 text-right">{{ numero(f.numLineaBase) }}</td>
              @for (anio of anios; track anio.n) {
                <td class="border-l border-slate-100 p-2 text-right">{{ numero(f[anio.prog]) }}</td>
                <td class="p-2 text-right">
                  {{ numero(f[anio.ejec]) }}
                  @if (pct(f[anio.prog], f[anio.ejec]) !== null) {
                    <span class="block text-[10px]" [ngClass]="esCritica(pct(f[anio.prog], f[anio.ejec])) ? 'font-semibold text-destructive' : 'text-slate-400'">
                      {{ pct(f[anio.prog], f[anio.ejec]) | number: '1.0-2' }} %
                    </span>
                  }
                </td>
              }
              <td class="border-l border-slate-100 p-2 text-right">{{ numero(f.numResultado) }}</td>
              <td class="p-2 text-right">
                @if (pctLineaBase(f) !== null) {
                  <span [ngClass]="(pctLineaBase(f) ?? 0) < 0 ? 'text-warning' : 'text-success'">{{ pctLineaBase(f) | number: '1.0-2' }} %</span>
                } @else { <span class="text-slate-400">—</span> }
              </td>
              <td class="p-2">
                <app-ui-status-pill [tone]="manual ? 'neutral' : 'primary'" [showIcon]="false" [text]="origen(f.txtOrigen)" />
              </td>
              <td class="p-2">
                <div class="flex justify-end gap-1">
                  @if (!soloLectura() && (manual || columnaExtra() === 'actividad')) {
                    <ui-button iconOnly size="sm" appearance="soft" severity="secondary" icon="edit" [ariaLabel]="'Editar la fila ' + f.numOrden" (onClick)="editar.emit($index)" />
                  }
                  @if (!soloLectura() && manual) {
                    <ui-button iconOnly size="sm" appearance="soft" severity="danger" icon="delete" [ariaLabel]="'Quitar la fila ' + f.numOrden" (onClick)="quitar.emit($index)" />
                  }
                </div>
              </td>
            </tr>
          } @empty {
            <tr><td [attr.colspan]="columnaExtra() ? 15 : 14" class="p-4 text-center text-slate-400">{{ vacio() }}</td></tr>
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
  editar = output<number>();
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

  extra(f: IndicadorEvaluacionDto): string | null {
    switch (this.columnaExtra()) {
      case 'destino': return f.txtDestino;
      case 'objetivo': return f.txtObjetivoEspecifico;
      case 'actividad': return f.txtActividad;
      default: return null;
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

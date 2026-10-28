import { Component, computed, input, output, signal } from '@angular/core';
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

/** Para ids únicos del detalle de cada fila cuando hay varias tablas en la página. */
let secuencia = 0;

/**
 * Tabla de indicadores del Anexo 22, de solo lectura y compacta (ADR 0015, D4): línea base, programado y ejecutado del
 * último año con meta y sus variaciones; el detalle de los tres años y el resultado se abren por fila. La desviación
 * crítica se marca en la celda de variación, no en la fila entera. La edición va en `IndicadorModalComponent`: la
 * tabla es muy ancha para editar en línea. Se editan las filas manuales y, en la sección VI, la actividad y los
 * comentarios de las filas del sistema; solo las manuales se pueden quitar.
 */
@Component({
  selector: 'app-tabla-indicadores',
  standalone: true,
  host: { class: 'block' },
  imports: [DecimalPipe, NgClass, UIButtonComponent, UiStatusPillComponent],
  template: `
    <div class="overflow-x-auto rounded-lg border border-border/60">
      <table class="w-full min-w-[720px] border-collapse text-left text-xs">
        <thead class="border-b border-border/60 bg-muted/40 text-muted-foreground">
          <tr>
            <th class="w-8 p-2"><span class="sr-only">Detalle por año</span></th>
            <th class="w-8 p-2">N°</th>
            <th class="p-2">Concepto</th>
            @if (columnaExtra()) { <th class="p-2">{{ tituloExtra() }}</th> }
            <th class="p-2 text-right">Línea base</th>
            <th class="p-2 text-right" title="Programado del último año con meta">Programado</th>
            <th class="p-2 text-right" title="Ejecutado de ese año (o el resultado al cierre)">Ejecutado</th>
            <th class="p-2 text-right" title="Ejecutado frente a lo programado de ese año">Var.</th>
            <th class="p-2 text-right" title="Ejecutado al cierre frente a la línea base">Var. vs LB</th>
            <th class="p-2">Origen</th>
            <th class="w-20 p-2"><span class="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          @for (f of filas(); track $index; let i = $index) {
            @let manual = f.txtOrigen === 'MANUAL';
            @let ref = referencia(f);
            @let abierta = abiertas().has(i);
            <tr class="border-b border-border/40 align-top">
              <td class="p-1.5">
                <button type="button" class="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                  [attr.aria-label]="(abierta ? 'Ocultar' : 'Ver') + ' el detalle por año de la fila ' + f.numOrden"
                  [attr.aria-expanded]="abierta" [attr.aria-controls]="abierta ? idDetalle(i) : null" (click)="alternar(i)">
                  <span class="material-symbols-outlined text-[18px]" aria-hidden="true">{{ abierta ? 'expand_less' : 'expand_more' }}</span>
                </button>
              </td>
              <td class="p-2 font-semibold text-muted-foreground">{{ f.numOrden }}</td>
              <td class="p-2">
                <span class="font-semibold text-foreground">{{ f.txtConcepto || '(sin concepto)' }}</span>
                <span class="block text-[11px] text-muted-foreground">{{ f.txtUnidadMedida ?? 'Sin unidad' }}</span>
                @if (f.txtComentarios) { <span class="block text-[11px] text-muted-foreground/70">{{ f.txtComentarios }}</span> }
              </td>
              @if (columnaExtra()) { <td class="p-2">{{ extra(f) ?? '—' }}</td> }
              <td class="p-2 text-right">{{ numero(f.numLineaBase) }}</td>
              <td class="p-2 text-right">
                {{ numero(ref.programado) }}
                @if (ref.anio) { <span class="block text-[11px] text-muted-foreground">Año {{ ref.anio }}</span> }
              </td>
              <td class="p-2 text-right">{{ numero(ref.ejecutado) }}</td>
              <td class="p-2 text-right">
                @if (ref.variacion !== null) {
                  <span class="inline-flex items-center gap-0.5" [ngClass]="esCritica(ref.variacion) ? 'rounded bg-destructive/10 px-1 font-semibold text-destructive' : 'text-muted-foreground'">
                    @if (esCritica(ref.variacion)) { <span class="material-symbols-outlined text-[14px]" aria-hidden="true">trending_down</span> }
                    {{ ref.variacion | number: '1.0-2' }} %
                  </span>
                } @else { <span class="text-muted-foreground/70">—</span> }
                @if (critica(f) && !esCritica(ref.variacion)) {
                  <span class="block text-[11px] font-semibold text-destructive">Crítica en otro año</span>
                }
              </td>
              <td class="p-2 text-right">
                @if (pctLineaBase(f) !== null) {
                  <span [ngClass]="(pctLineaBase(f) ?? 0) < 0 ? 'text-warning' : 'text-success'">{{ pctLineaBase(f) | number: '1.0-2' }} %</span>
                } @else { <span class="text-muted-foreground/70">—</span> }
              </td>
              <td class="p-2">
                <app-ui-status-pill [tone]="manual ? 'neutral' : 'primary'" [showIcon]="false" [text]="origen(f.txtOrigen)" />
              </td>
              <td class="p-2">
                <div class="flex justify-end gap-1">
                  @if (!soloLectura() && (manual || columnaExtra() === 'actividad')) {
                    <ui-button iconOnly size="sm" appearance="soft" severity="secondary" icon="edit" [ariaLabel]="'Editar la fila ' + f.numOrden" (onClick)="editar.emit(i)" />
                  }
                  @if (!soloLectura() && manual) {
                    <ui-button iconOnly size="sm" appearance="soft" severity="danger" icon="delete" [ariaLabel]="'Quitar la fila ' + f.numOrden" (onClick)="quitar.emit(i)" />
                  }
                </div>
              </td>
            </tr>
            @if (abierta) {
              <tr [id]="idDetalle(i)" class="border-b border-border/40 bg-muted/20">
                <td></td>
                <td [attr.colspan]="columnas() - 1" class="p-2">
                  <dl class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    @for (anio of anios; track anio.n) {
                      @let v = pct(f[anio.prog], f[anio.ejec]);
                      <div>
                        <dt class="font-semibold text-muted-foreground">Año {{ anio.n }}</dt>
                        <dd class="text-foreground">
                          {{ numero(f[anio.ejec]) }} de {{ numero(f[anio.prog]) }}
                          @if (v !== null) {
                            <span [ngClass]="esCritica(v) ? 'font-semibold text-destructive' : 'text-muted-foreground'">({{ v | number: '1.0-2' }} %)</span>
                          }
                        </dd>
                      </div>
                    }
                    <div>
                      <dt class="font-semibold text-muted-foreground">Resultado al cierre</dt>
                      <dd class="text-foreground">{{ numero(f.numResultado) }}</dd>
                    </div>
                  </dl>
                </td>
              </tr>
            }
          } @empty {
            <tr><td [attr.colspan]="columnas()" class="p-4 text-center text-muted-foreground/70">{{ vacio() }}</td></tr>
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

  /** Índices de las filas con el detalle por año abierto. */
  abiertas = signal(new Set<number>());
  /** Columnas de la tabla, para los `colspan`. */
  columnas = computed(() => (this.columnaExtra() ? 11 : 10));
  private readonly prefijo = `tabla-ind-${++secuencia}`;

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

  alternar(indice: number) {
    this.abiertas.update(abiertas => {
      const copia = new Set(abiertas);
      if (!copia.delete(indice)) copia.add(indice);
      return copia;
    });
  }

  idDetalle(indice: number): string {
    return `${this.prefijo}-detalle-${indice}`;
  }

  /**
   * Año que resume la fila: el último con meta programada. El ejecutado es el resultado al cierre si lo hay o, si no, el
   * de ese año.
   */
  referencia(f: IndicadorEvaluacionDto): { anio: number | null; programado: number | null; ejecutado: number | null; variacion: number | null } {
    const anio = [...this.anios].reverse().find(a => f[a.prog] != null) ?? null;
    const programado = anio ? f[anio.prog] : null;
    const ejecutado = f.numResultado ?? (anio ? f[anio.ejec] : null);
    return { anio: anio?.n ?? null, programado, ejecutado, variacion: variacion(programado, ejecutado) };
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

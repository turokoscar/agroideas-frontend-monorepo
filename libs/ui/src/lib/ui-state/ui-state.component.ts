import { Component, booleanAttribute, computed, input, output } from '@angular/core';
import { NgClass } from '@angular/common';
import { UIButtonComponent } from '../ui-button/ui-button.component';

export type UiStateKind = 'loading' | 'error' | 'empty';

/**
 * Estado de una sección mientras carga, si falla (con "Reintentar") o si no tiene datos, con el mismo aspecto en toda
 * la app (alineado con el vacío de `app-ui-data-table`). `framed` lo pinta como tarjeta; `compact` reduce el relleno
 * (dentro de una tarjeta o de una celda). La carga se anuncia a los lectores de pantalla (`role="status"`) y el error
 * como alerta.
 */
@Component({
  selector: 'ui-state',
  standalone: true,
  host: { class: 'block' },
  imports: [NgClass, UIButtonComponent],
  template: `
    <div
      class="flex flex-col items-center justify-center gap-2 text-center"
      [ngClass]="contenedor()"
      [attr.role]="kind() === 'error' ? 'alert' : 'status'"
    >
      @switch (kind()) {
        @case ('loading') {
          <span class="material-symbols-outlined animate-spin text-[22px] text-muted-foreground" aria-hidden="true">progress_activity</span>
        }
        @case ('error') {
          <span class="material-symbols-outlined text-[28px] text-destructive" aria-hidden="true">{{ icon() || 'error' }}</span>
        }
        @default {
          <span class="material-symbols-outlined text-[32px] text-muted-foreground/70" aria-hidden="true">{{ icon() || 'inbox' }}</span>
        }
      }
      <p class="text-sm font-medium" [ngClass]="kind() === 'loading' ? 'text-muted-foreground' : 'text-foreground'">{{ texto() }}</p>
      @if (detail()) {
        <p class="max-w-prose text-xs text-muted-foreground">{{ detail() }}</p>
      }
      @if (kind() === 'error' && retryLabel()) {
        <ui-button class="mt-1" size="sm" appearance="soft" severity="secondary" icon="refresh" [label]="retryLabel()" (onClick)="retry.emit()" />
      }
    </div>
  `
})
export class UiStateComponent {
  kind = input.required<UiStateKind>();
  /** Mensaje principal; por defecto "Cargando…", "No se pudo cargar." o "Sin datos.". */
  message = input('');
  detail = input('');
  /** Ícono de Material Symbols para el error o el vacío. */
  icon = input('');
  /** Texto del botón de reintento del error; vacío lo oculta. */
  retryLabel = input('Reintentar');
  framed = input(false, { transform: booleanAttribute });
  compact = input(false, { transform: booleanAttribute });

  retry = output<void>();

  protected texto = computed(
    () => this.message() || { loading: 'Cargando…', error: 'No se pudo cargar.', empty: 'Sin datos.' }[this.kind()]
  );

  protected contenedor = computed(() => {
    const relleno = this.compact() ? 'py-6 px-4' : 'py-12 px-6';
    if (!this.framed()) return relleno;
    const borde = this.kind() === 'error' ? 'border-destructive/30 bg-destructive/5' : this.kind() === 'empty' ? 'border-dashed border-border bg-card' : 'border-border bg-card';
    return `${relleno} rounded-xl border shadow-sm ${borde}`;
  });
}

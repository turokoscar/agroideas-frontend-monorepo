import { Component, ElementRef, booleanAttribute, input, output, viewChildren } from '@angular/core';
import { NgClass } from '@angular/common';

/** Pestaña de `ui-tabs`. `count` muestra un contador junto a la etiqueta (`null`/ausente: sin contador). */
export interface UiTab {
  key: string;
  label: string;
  count?: number | string | null;
  disabled?: boolean;
}

/**
 * Pestañas tipo píldora con el patrón de WAI-ARIA: foco itinerante (solo la activa entra en el orden de tabulación) y
 * ←/→, Inicio y Fin para recorrerlas; la que recibe el foco se activa. El contenido de cada pestaña lo pinta el host:
 * si le da al panel el `id` de `panelId`, la pestaña activa queda enlazada con `aria-controls`.
 */
@Component({
  selector: 'ui-tabs',
  standalone: true,
  host: { class: 'block' },
  imports: [NgClass],
  template: `
    <div class="flex flex-wrap" [ngClass]="contained() ? 'w-fit gap-1 rounded-xl bg-muted p-1' : 'gap-2'"
      role="tablist" [attr.aria-label]="ariaLabel() || null">
      @for (tab of tabs(); track tab.key; let i = $index) {
        <button
          #pestana
          type="button"
          role="tab"
          class="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
          [ngClass]="
            tab.key === active()
              ? 'bg-primary text-primary-foreground shadow-sm'
              : (contained() ? '' : 'bg-surface-container ') + 'text-muted-foreground hover:text-foreground'
          "
          [disabled]="tab.disabled"
          [attr.aria-selected]="tab.key === active()"
          [attr.aria-controls]="tab.key === active() && panelId() ? panelId() : null"
          [attr.tabindex]="tab.key === active() ? 0 : -1"
          (click)="activar(tab)"
          (keydown)="teclear($event, i)"
        >
          {{ tab.label }}
          @if (tab.count !== undefined && tab.count !== null) {
            <span class="min-w-[20px] rounded-full px-1.5 py-0.5 text-center text-[10px]"
              [ngClass]="tab.key === active() ? 'bg-primary-foreground/20' : 'bg-muted'">{{ tab.count }}</span>
          }
        </button>
      }
    </div>
  `
})
export class UiTabsComponent {
  tabs = input.required<readonly UiTab[]>();
  /** `key` de la pestaña activa. */
  active = input.required<string>();
  ariaLabel = input('');
  /** `id` del panel que muestra el contenido de la pestaña activa. */
  panelId = input('');
  /** Variante compacta sobre un fondo (p. ej. dentro de una tarjeta). */
  contained = input(false, { transform: booleanAttribute });

  activeChange = output<string>();

  private botones = viewChildren<ElementRef<HTMLButtonElement>>('pestana');

  protected activar(tab: UiTab): void {
    if (!tab.disabled && tab.key !== this.active()) {
      this.activeChange.emit(tab.key);
    }
  }

  protected teclear(evento: KeyboardEvent, indice: number): void {
    const habilitadas = this.tabs()
      .map((t, i) => ({ t, i }))
      .filter(x => !x.t.disabled);
    const posicion = habilitadas.findIndex(x => x.i === indice);
    let destino: number | null = null;
    switch (evento.key) {
      case 'ArrowRight':
        destino = habilitadas[(posicion + 1) % habilitadas.length].i;
        break;
      case 'ArrowLeft':
        destino = habilitadas[(posicion - 1 + habilitadas.length) % habilitadas.length].i;
        break;
      case 'Home':
        destino = habilitadas[0].i;
        break;
      case 'End':
        destino = habilitadas[habilitadas.length - 1].i;
        break;
    }
    if (destino === null) return;
    evento.preventDefault();
    this.botones()[destino]?.nativeElement.focus();
    this.activar(this.tabs()[destino]);
  }
}

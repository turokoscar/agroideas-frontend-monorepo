import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Ícono de ayuda contextual para jerga institucional (R1/T1/R2/F1, Anexo 17/18/19, etc.) que un
 * usuario nuevo del rol UN/OA puede no conocer todavía -- hallazgo #7 de la revisión UX de
 * ADR-017/019 en `apps/sigec-rtf`. Deliberadamente simple: usa el atributo `title` nativo del
 * navegador en vez de un popover propio -- sin JS de posicionamiento, sin overlay, y ya es
 * accesible por foco+teclado. `tabindex="0"` lo hace alcanzable aunque el ícono en sí no sea un
 * elemento interactivo nativo.
 */
@Component({
  selector: 'ui-info-tooltip',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      class="inline-flex items-center justify-center rounded-full text-muted-foreground/70 hover:text-primary focus-visible:text-primary focus-visible:outline-2 focus-visible:outline-primary cursor-help align-middle"
      [title]="text()"
      tabindex="0"
      role="img"
      [attr.aria-label]="text()"
    >
      <span class="material-symbols-outlined text-[14px]" aria-hidden="true">info</span>
    </span>
  `
})
export class UiInfoTooltipComponent {
  /** Texto del tooltip nativo (atributo `title`) -- explica el término en 1-2 frases. */
  text = input.required<string>();
}

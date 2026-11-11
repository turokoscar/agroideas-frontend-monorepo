import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Encabezado de página: título (`<h1>`) y subtítulo con los tokens del tema, igual en todas las apps.
 *
 * - `title` / `subtitle` para el caso simple.
 * - `[page-header-subtitle]`: subtítulo con contenido propio (p. ej. un dato resaltado); se pinta debajo del título
 *   con el mismo estilo que `subtitle`.
 * - `[page-header-actions]`: botones o controles a la derecha del título (debajo, en móvil).
 *
 * ```html
 * <ui-page-header title="Kardex" subtitle="Movimientos financieros">
 *   <ui-button page-header-actions label="Cerrar periodo" />
 * </ui-page-header>
 * ```
 *
 * No agrega margen exterior: el espacio con el resto de la página lo pone el contenedor (`page-container`).
 */
@Component({
  selector: 'ui-page-header',
  standalone: true,
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div class="min-w-0">
        <h1 class="text-2xl font-bold tracking-tight text-foreground">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="mt-1 text-sm text-muted-foreground">{{ subtitle() }}</p>
        }
        <div class="mt-1 text-sm text-muted-foreground empty:hidden"><ng-content select="[page-header-subtitle]" /></div>
      </div>
      <div class="flex flex-wrap items-center gap-2 empty:hidden"><ng-content select="[page-header-actions]" /></div>
    </header>
  `
})
export class UiPageHeaderComponent {
  title = input.required<string>();
  subtitle = input('');
}

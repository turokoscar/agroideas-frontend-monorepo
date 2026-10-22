import { Component, OnDestroy, computed, input, output, signal } from '@angular/core';

let siguienteId = 0;

/**
 * Búsqueda con sugerencias mientras se escribe (patrón combobox de WAI-ARIA), para elegir un registro de una API sin
 * conocer su ID: el host escucha `search` (ya con espera y longitud mínima), consulta y devuelve `options`; al elegir,
 * emite `optionSelected` (y `null` si el usuario vuelve a escribir).
 *
 * A diferencia de `lib-ui-select-search` (PrimeNG Dropdown, busca al presionar Enter y depende de estilos globales de
 * sat-ui), no usa PrimeNG y se estiliza con el tema. La lista va en el flujo de la página, debajo del campo, para no
 * quedar recortada dentro de un `app-ui-modal` (su cuerpo tiene `overflow-y: auto`).
 *
 * Teclado: ↓/↑ recorren las sugerencias, Enter elige, Escape cierra la lista.
 */
@Component({
  selector: 'ui-autocomplete',
  standalone: true,
  template: `
    <div class="relative">
      <span class="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[18px] text-muted-foreground" aria-hidden="true">search</span>
      <input
        [id]="inputId()"
        type="text"
        role="combobox"
        autocomplete="off"
        spellcheck="false"
        class="form-input pl-9"
        [placeholder]="placeholder()"
        [disabled]="disabled()"
        [value]="texto()"
        [attr.aria-expanded]="abierta()"
        [attr.aria-controls]="listaId"
        aria-autocomplete="list"
        [attr.aria-activedescendant]="abierta() && activa() >= 0 ? opcionId(activa()) : null"
        [attr.aria-describedby]="ayudaId"
        (input)="escribir($any($event.target).value)"
        (focus)="enfocado.set(true)"
        (blur)="enfocado.set(false)"
        (keydown)="teclear($event)"
      />
    </div>

    @if (abierta()) {
      <ul [id]="listaId" role="listbox" class="mt-1 max-h-64 overflow-y-auto rounded-md border border-border bg-card py-1 shadow-sm">
        @if (loading()) {
          <li class="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground" role="presentation">
            <span class="material-symbols-outlined animate-spin text-[16px]" aria-hidden="true">progress_activity</span> Buscando…
          </li>
        } @else {
          @for (opcion of options(); track $index) {
            <li
              [id]="opcionId($index)"
              role="option"
              class="cursor-pointer px-3 py-2 text-xs"
              [class.bg-muted]="$index === activa()"
              [attr.aria-selected]="$index === activa()"
              (mousedown)="$event.preventDefault()"
              (mouseenter)="activa.set($index)"
              (click)="elegir(opcion)"
            >
              <span class="block font-medium text-foreground">{{ displayWith()(opcion) }}</span>
              @if (detailWith()(opcion); as detalle) {
                <span class="block text-[11px] text-muted-foreground">{{ detalle }}</span>
              }
            </li>
          } @empty {
            <li class="px-3 py-2 text-xs text-muted-foreground" role="presentation">{{ emptyMessage() }}</li>
          }
        }
      </ul>
    }

    <p [id]="ayudaId" class="mt-1 text-[11px] text-muted-foreground" [class.sr-only]="!mostrarAyuda()">{{ hintMessage() }}</p>
  `
})
export class UiAutocompleteComponent<T> implements OnDestroy {
  /** `id` del campo, para asociarle un `<label for>`. */
  inputId = input(`ui-autocomplete-${siguienteId}`);
  placeholder = input('');
  options = input<readonly T[]>([]);
  loading = input(false);
  disabled = input(false);
  /** Caracteres mínimos antes de buscar. */
  minLength = input(2);
  /** Espera desde la última tecla hasta emitir `search`. */
  debounceMs = input(300);
  emptyMessage = input('Sin resultados.');
  hintMessage = input('Escriba para buscar.');
  /** Texto principal de cada sugerencia; también queda en el campo al elegirla. */
  displayWith = input.required<(opcion: T) => string>();
  /** Segunda línea opcional de cada sugerencia. */
  detailWith = input<(opcion: T) => string | null>(() => null);

  /** Término a buscar, ya recortado, con la longitud mínima y tras la espera. */
  search = output<string>();
  /** Sugerencia elegida, o `null` cuando el usuario cambia el texto después de elegir. */
  optionSelected = output<T | null>();

  protected readonly listaId = `ui-autocomplete-lista-${siguienteId}`;
  protected readonly ayudaId = `ui-autocomplete-ayuda-${siguienteId++}`;
  protected texto = signal('');
  protected activa = signal(-1);
  protected enfocado = signal(false);
  private elegido = signal(false);
  private temporizador?: ReturnType<typeof setTimeout>;

  private termino = computed(() => this.texto().trim());
  protected abierta = computed(() => this.enfocado() && !this.elegido() && this.termino().length >= this.minLength());
  protected mostrarAyuda = computed(() => !this.elegido() && this.termino().length < this.minLength());

  protected opcionId(indice: number): string {
    return `${this.listaId}-${indice}`;
  }

  protected escribir(valor: string): void {
    this.texto.set(valor);
    this.enfocado.set(true);
    this.activa.set(-1);
    if (this.elegido()) {
      this.elegido.set(false);
      this.optionSelected.emit(null);
    }
    clearTimeout(this.temporizador);
    const termino = valor.trim();
    if (termino.length >= this.minLength()) {
      this.temporizador = setTimeout(() => this.search.emit(termino), this.debounceMs());
    }
  }

  protected teclear(evento: KeyboardEvent): void {
    const total = this.options().length;
    if (!this.abierta() || this.loading()) {
      return;
    }
    switch (evento.key) {
      case 'ArrowDown':
        evento.preventDefault();
        this.activa.set(total ? (this.activa() + 1) % total : -1);
        break;
      case 'ArrowUp':
        evento.preventDefault();
        this.activa.set(total ? (this.activa() - 1 + total) % total : -1);
        break;
      case 'Enter': {
        const opcion = this.options()[this.activa()];
        if (opcion !== undefined) {
          evento.preventDefault();
          this.elegir(opcion);
        }
        break;
      }
      case 'Escape':
        evento.preventDefault();
        this.enfocado.set(false);
        break;
    }
  }

  protected elegir(opcion: T): void {
    clearTimeout(this.temporizador);
    this.texto.set(this.displayWith()(opcion));
    this.elegido.set(true);
    this.activa.set(-1);
    this.optionSelected.emit(opcion);
  }

  /** Vacía el campo y la selección (p. ej. al cerrar el modal que lo contiene). */
  clear(): void {
    clearTimeout(this.temporizador);
    this.texto.set('');
    this.elegido.set(false);
    this.activa.set(-1);
  }

  ngOnDestroy(): void {
    clearTimeout(this.temporizador);
  }
}

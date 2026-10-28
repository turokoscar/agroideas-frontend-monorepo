import { Directive, ElementRef, computed, inject, input } from '@angular/core';

/**
 * Marca un control con error (ADR 0014, Fase 5): `aria-invalid`, la clase `form-invalid` del tema (borde rojo) y
 * `aria-describedby` hacia el mensaje de `app-error-campo` (`{id}-error`). Recibe el mensaje o null:
 * `[appInvalido]="errorDe('acta-localidad')"`. Si el control además tiene una ayuda, su id va en `ayudaId`: el
 * `aria-describedby` los encadena (un solo dueño del atributo).
 */
@Directive({
  selector: '[appInvalido]',
  standalone: true,
  host: {
    '[attr.aria-invalid]': 'appInvalido() ? true : null',
    '[attr.aria-describedby]': 'describidoPor()',
    '[class.form-invalid]': '!!appInvalido()'
  }
})
export class CampoInvalidoDirective {
  protected elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  appInvalido = input<string | null | undefined>(null);
  /** `id` de la ayuda del control, si la tiene. */
  ayudaId = input<string | null>(null);

  protected describidoPor = computed(() => {
    const ids = [this.ayudaId(), this.appInvalido() ? this.elemento.nativeElement.id + '-error' : null].filter(Boolean);
    return ids.length ? ids.join(' ') : null;
  });
}

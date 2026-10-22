import { Directive, ElementRef, inject, input } from '@angular/core';

/**
 * Marca un control con error (ADR 0014, Fase 5): `aria-invalid`, la clase `form-invalid` del tema (borde rojo) y
 * `aria-describedby` hacia el mensaje de `app-error-campo` (`{id}-error`). Recibe el mensaje o null:
 * `[appInvalido]="errorDe('acta-localidad')"`.
 */
@Directive({
  selector: '[appInvalido]',
  standalone: true,
  host: {
    '[attr.aria-invalid]': 'appInvalido() ? true : null',
    '[attr.aria-describedby]': "appInvalido() ? elemento.nativeElement.id + '-error' : null",
    '[class.form-invalid]': '!!appInvalido()'
  }
})
export class CampoInvalidoDirective {
  protected elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  appInvalido = input<string | null | undefined>(null);
}

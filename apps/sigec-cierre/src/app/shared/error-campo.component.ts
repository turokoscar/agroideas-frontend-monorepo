import { Component, input } from '@angular/core';

/** Mensaje de error bajo un campo, enlazado por `aria-describedby` desde `appInvalido` (`{para}-error`). */
@Component({
  selector: 'app-error-campo',
  standalone: true,
  template: `
    @if (mensaje()) {
      <p [id]="para() + '-error'" class="mt-1 flex items-start gap-1 text-[11px] font-medium text-destructive">
        <span class="material-symbols-outlined text-[14px]" aria-hidden="true">error</span>{{ mensaje() }}
      </p>
    }
  `
})
export class ErrorCampoComponent {
  /** `id` del control al que acompaña. */
  para = input.required<string>();
  mensaje = input<string | null | undefined>(null);
}

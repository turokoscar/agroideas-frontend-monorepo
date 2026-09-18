import { Component, inject } from '@angular/core';
import { ToastService, ToastType } from '../toast.service';

/**
 * Único consumidor visual de `ToastService.messages` — hasta ahora el servicio existía y se
 * llamaba desde toda la app (success/error tras cada guardado), pero ningún componente
 * renderizaba la señal, así que ningún toast se veía nunca. Se monta una sola vez en la raíz
 * de la app (`app.component.html`), junto al `<router-outlet>`, para cubrir todas las rutas.
 */
@Component({
  selector: 'app-ui-toast-container',
  standalone: true,
  template: `
    <div class="fixed top-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2" role="region" aria-live="polite">
      @for (msg of toastService.messages(); track msg.id) {
        <div class="flex items-start gap-3 rounded-xl border p-4 shadow-lg bg-card" [class]="estiloPorTipo(msg.type)">
          <span class="material-symbols-outlined text-[20px] shrink-0 mt-0.5">{{ iconoPorTipo(msg.type) }}</span>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold">{{ msg.title }}</p>
            @if (msg.description) {
              <p class="text-xs mt-0.5 text-foreground/70">{{ msg.description }}</p>
            }
          </div>
          <button
            type="button"
            class="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            (click)="toastService.remove(msg.id)"
            aria-label="Cerrar notificación"
          >
            <span class="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      }
    </div>
  `,
})
export class UiToastContainerComponent {
  readonly toastService = inject(ToastService);

  estiloPorTipo(tipo: ToastType): string {
    switch (tipo) {
      case 'success': return 'border-success/30 text-success';
      case 'error': return 'border-destructive/30 text-destructive';
      case 'warning': return 'border-warning/30 text-warning';
      case 'info': return 'border-info/30 text-info';
    }
  }

  iconoPorTipo(tipo: ToastType): string {
    switch (tipo) {
      case 'success': return 'check_circle';
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
    }
  }
}

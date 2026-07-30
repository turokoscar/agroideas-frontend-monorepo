import { ErrorHandler, inject, Injectable } from '@angular/core';
import { ToastService } from '@agroideas/ui';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private toast = inject(ToastService, { optional: true });

  handleError(error: unknown): void {
    const message = error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
    console.error('[GlobalErrorHandler]', error);
    this.toast?.error('Error', message);
  }
}

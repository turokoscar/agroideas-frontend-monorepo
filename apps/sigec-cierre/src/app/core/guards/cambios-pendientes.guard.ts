import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { CambiosPendientesService } from '../services/cambios-pendientes.service';

/** Pregunta antes de salir de una ruta con un formulario sin guardar (ADR 0015, D2). */
export const cambiosPendientesGuard: CanDeactivateFn<unknown> = () =>
  !inject(CambiosPendientesService).hayCambios() ||
  window.confirm('Hay cambios sin guardar en el formulario. ¿Salir de todas formas? Se perderán.');

import { Injectable } from '@angular/core';

/**
 * Formularios con cambios sin guardar (ADR 0015, D2). Cada formulario se registra con una función que dice si tiene
 * cambios pendientes; el guard `cambiosPendientesGuard` pregunta antes de dejar la ruta y, al cerrar o recargar la
 * pestaña, el navegador muestra su propio aviso.
 */
@Injectable({ providedIn: 'root' })
export class CambiosPendientesService {
  private fuentes = new Set<() => boolean>();

  constructor() {
    window.addEventListener('beforeunload', evento => {
      if (this.hayCambios()) evento.preventDefault();
    });
  }

  /** Registra un formulario; devuelve la función para quitarlo (al destruirse). */
  registrar(hayCambios: () => boolean): () => void {
    this.fuentes.add(hayCambios);
    return () => this.fuentes.delete(hayCambios);
  }

  hayCambios(): boolean {
    return [...this.fuentes].some(hayCambios => hayCambios());
  }
}

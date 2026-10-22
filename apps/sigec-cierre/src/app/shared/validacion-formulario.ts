import { Injector, afterNextRender, computed, signal } from '@angular/core';

/** Problema de un campo del formulario: `id` del control en la plantilla (null si no se edita aquí) y mensaje. */
export interface ErrorCampo {
  id: string | null;
  mensaje: string;
}

/**
 * Validación por campo de un formulario editado con ngModel (ADR 0014, Fase 5), compartida por el Acta y el Anexo 22.
 * - `bloqueantes`: lo que la API rechazaría al guardar; `faltantes`: lo que falta para presentar (no impide guardar).
 * - Los campos se editan sobre el objeto del formulario, que no avisa a las señales: `tocar()` en cada edición hace
 *   recalcular las reglas.
 * - Los errores se muestran desde el primer intento de guardar o al pedir "Revisar lo que falta"; un bloqueante
 *   reemplaza al faltante del mismo campo.
 */
export class ValidacionFormulario {
  private cambios = signal(0);
  readonly mostrar = signal(false);

  readonly bloqueantes = computed(() => {
    this.cambios();
    return this.reglas.bloqueantes();
  });
  readonly faltantes = computed(() => {
    this.cambios();
    return this.reglas.faltantes();
  });
  private errores = computed(() =>
    this.mostrar()
      ? new Map([...this.faltantes(), ...this.bloqueantes()].flatMap(e => (e.id ? [[e.id, e.mensaje] as const] : [])))
      : new Map<string, string>()
  );

  constructor(
    private injector: Injector,
    private reglas: { bloqueantes: () => ErrorCampo[]; faltantes: () => ErrorCampo[] }
  ) {}

  /** Una edición del formulario. */
  tocar(): void {
    this.cambios.update(n => n + 1);
  }

  /** Mensaje de error del control `id`, o null. */
  error(id: string): string | null {
    return this.errores().get(id) ?? null;
  }

  /** Muestra los errores y lleva al primero (bloqueantes antes que faltantes). */
  revisar(): void {
    this.mostrar.set(true);
    this.enfocar([...this.bloqueantes(), ...this.faltantes()].find(e => e.id)?.id ?? null);
  }

  /** Lleva el foco (y la vista) al control `id`. */
  enfocar(id: string | null): void {
    if (!id) return;
    afterNextRender(
      () => {
        const control = document.getElementById(id);
        control?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        control?.focus({ preventScroll: true });
      },
      { injector: this.injector }
    );
  }
}

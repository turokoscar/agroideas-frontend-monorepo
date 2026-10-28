import { Directive, ElementRef, afterRender, inject } from '@angular/core';

/** Alto máximo, en px, hasta el que crece; más allá, el textarea se desplaza por dentro. */
const ALTO_MAXIMO = 480;

/**
 * Textarea que crece con su contenido (ADR 0015, D7): el texto largo se lee entero sin desplazarse dentro del campo.
 * `rows` sigue siendo el alto mínimo. ngModel escribe el valor sin eventos, así que se ajusta tras cada render, solo si
 * el texto cambió.
 */
@Directive({
  selector: 'textarea[appCrecer]',
  standalone: true,
  host: { class: 'resize-none', '(input)': 'ajustar()' }
})
export class CrecerDirective {
  private campo = inject<ElementRef<HTMLTextAreaElement>>(ElementRef).nativeElement;
  private ultimo: string | null = null;

  constructor() {
    afterRender(() => {
      if (this.campo.value !== this.ultimo) this.ajustar();
    });
  }

  ajustar(): void {
    this.ultimo = this.campo.value;
    this.campo.style.height = 'auto';
    const alto = this.campo.scrollHeight;
    this.campo.style.height = `${Math.min(alto, ALTO_MAXIMO)}px`;
    this.campo.style.overflowY = alto > ALTO_MAXIMO ? 'auto' : 'hidden';
  }
}

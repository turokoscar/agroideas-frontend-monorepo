import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { CrecerDirective } from './crecer.directive';

@Component({
  standalone: true,
  imports: [FormsModule, CrecerDirective],
  template: `<textarea appCrecer rows="3" [(ngModel)]="texto"></textarea>`
})
class AnfitrionComponent {
  texto = signal('');
}

describe('CrecerDirective', () => {
  it('ajusta el alto al contenido cuando el valor cambia, también si lo escribe ngModel', async () => {
    const fixture = TestBed.createComponent(AnfitrionComponent);
    const campo = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    // jsdom no calcula el layout: se simula el alto del contenido.
    let alto = 60;
    Object.defineProperty(campo, 'scrollHeight', { get: () => alto });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(campo.classList).toContain('resize-none');

    alto = 200;
    fixture.componentInstance.texto.set('Un análisis\ncon varias\nlíneas');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(campo.style.height).toBe('200px');
    expect(campo.style.overflowY).toBe('hidden');

    alto = 900;
    campo.value = 'Muy largo';
    campo.dispatchEvent(new Event('input'));
    expect(campo.style.height).toBe('480px');
    expect(campo.style.overflowY).toBe('auto');
  });
});

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiPageHeaderComponent } from './ui-page-header.component';

@Component({
  standalone: true,
  imports: [UiPageHeaderComponent],
  template: `
    <ui-page-header title="Kardex">
      <span page-header-subtitle>Convenio <strong>0012-2026-ST</strong></span>
      <button page-header-actions type="button">Cerrar periodo</button>
    </ui-page-header>
  `
})
class HostConSlotsComponent {}

describe('UiPageHeaderComponent', () => {
  function crear(entradas: Record<string, unknown>) {
    const fixture = TestBed.createComponent(UiPageHeaderComponent);
    Object.entries(entradas).forEach(([k, v]) => fixture.componentRef.setInput(k, v));
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('pinta el título como h1 y el subtítulo', () => {
    const el = crear({ title: 'Convenios', subtitle: 'Consulta y seguimiento' });
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('Convenios');
    expect(el.querySelector('p')?.textContent?.trim()).toBe('Consulta y seguimiento');
  });

  it('omite el párrafo de subtítulo si no se indica', () => {
    const el = crear({ title: 'Convenios' });
    expect(el.querySelector('p')).toBeNull();
  });

  it('proyecta el subtítulo con contenido propio y las acciones', () => {
    const fixture = TestBed.createComponent(HostConSlotsComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('Kardex');
    expect(el.querySelector('[page-header-subtitle] strong')?.textContent).toBe('0012-2026-ST');
    expect(el.querySelector('[page-header-actions]')?.textContent).toBe('Cerrar periodo');
  });
});

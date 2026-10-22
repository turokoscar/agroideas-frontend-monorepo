import { TestBed } from '@angular/core/testing';
import { UiTab, UiTabsComponent } from './ui-tabs.component';

describe('UiTabsComponent', () => {
  const tabs: UiTab[] = [
    { key: 'documentos', label: 'Documentos', count: 5 },
    { key: 'plazos', label: 'Plazos', count: 0 },
    { key: 'bitacora', label: 'Bitácora' },
    { key: 'envios', label: 'Correos', disabled: true }
  ];

  function crear(activa = 'documentos') {
    const fixture = TestBed.createComponent(UiTabsComponent);
    fixture.componentRef.setInput('tabs', tabs);
    fixture.componentRef.setInput('active', activa);
    fixture.componentRef.setInput('panelId', 'panel');
    const emitidas: string[] = [];
    fixture.componentInstance.activeChange.subscribe(k => emitidas.push(k));
    fixture.detectChanges();
    const botones = [...fixture.nativeElement.querySelectorAll('[role="tab"]')] as HTMLButtonElement[];
    return { fixture, botones, emitidas };
  }

  it('marca la activa, la deja sola en el orden de tabulación y muestra los contadores (también el 0)', () => {
    const { botones } = crear('plazos');
    expect(botones.map(b => b.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false', 'false']);
    expect(botones.map(b => b.tabIndex)).toEqual([-1, 0, -1, -1]);
    expect(botones[1].getAttribute('aria-controls')).toBe('panel');
    expect(botones[0].textContent).toContain('5');
    expect(botones[1].textContent).toContain('0');
  });

  it('activa con el clic, pero no la deshabilitada ni la que ya está activa', () => {
    const { botones, emitidas } = crear();
    botones[0].click();
    botones[3].click();
    botones[2].click();
    expect(emitidas).toEqual(['bitacora']);
  });

  it('recorre con las flechas, Inicio y Fin, saltando la deshabilitada', () => {
    const { botones, emitidas } = crear();
    const tecla = (i: number, key: string) => botones[i].dispatchEvent(new KeyboardEvent('keydown', { key }));
    tecla(0, 'ArrowRight');
    tecla(2, 'ArrowRight');
    tecla(0, 'ArrowLeft');
    tecla(2, 'Home');
    tecla(0, 'End');
    expect(emitidas).toEqual(['plazos', 'bitacora', 'bitacora']);
    expect(document.activeElement).toBe(botones[2]);
  });
});

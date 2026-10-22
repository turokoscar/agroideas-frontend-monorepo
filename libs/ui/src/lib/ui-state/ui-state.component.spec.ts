import { TestBed } from '@angular/core/testing';
import { UiStateComponent, UiStateKind } from './ui-state.component';

describe('UiStateComponent', () => {
  function crear(kind: UiStateKind, entradas: Record<string, unknown> = {}) {
    const fixture = TestBed.createComponent(UiStateComponent);
    fixture.componentRef.setInput('kind', kind);
    Object.entries(entradas).forEach(([k, v]) => fixture.componentRef.setInput(k, v));
    fixture.detectChanges();
    return fixture;
  }

  it('carga: mensaje por defecto anunciado como estado', () => {
    const el: HTMLElement = crear('loading').nativeElement;
    expect(el.querySelector('[role="status"]')?.textContent).toContain('Cargando…');
    expect(el.querySelector('ui-button')).toBeNull();
  });

  it('error: alerta con el mensaje y "Reintentar"', () => {
    const fixture = crear('error', { message: 'El servicio no responde.' });
    const reintentos = jest.fn();
    fixture.componentInstance.retry.subscribe(reintentos);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('El servicio no responde.');
    (el.querySelector('ui-button button') as HTMLButtonElement).click();
    expect(reintentos).toHaveBeenCalled();
  });

  it('vacío: ícono, mensaje y detalle; sin reintento', () => {
    const el: HTMLElement = crear('empty', { message: 'Sin documentos.', detail: 'Aparecen al avanzar.', icon: 'description' }).nativeElement;
    expect(el.textContent).toContain('Sin documentos.');
    expect(el.textContent).toContain('Aparecen al avanzar.');
    expect(el.textContent).toContain('description');
    expect(el.querySelector('ui-button')).toBeNull();
  });
});

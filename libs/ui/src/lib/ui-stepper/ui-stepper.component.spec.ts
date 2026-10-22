import { TestBed } from '@angular/core/testing';
import { UiStep, UiStepperComponent } from './ui-stepper.component';

describe('UiStepperComponent', () => {
  const steps: UiStep[] = [
    { key: 'a', title: 'Anexo 20', subtitle: 'OA', status: 'done' },
    { key: 'b', title: 'Acta', status: 'current' },
    { key: 'c', title: 'Anexo 22', status: 'pending' }
  ];

  function crear(navigable: boolean) {
    const fixture = TestBed.createComponent(UiStepperComponent);
    fixture.componentRef.setInput('steps', steps);
    fixture.componentRef.setInput('navigable', navigable);
    fixture.detectChanges();
    return fixture;
  }

  it('numera los pendientes, marca los completados y señala el actual', () => {
    const el: HTMLElement = crear(false).nativeElement;
    expect(el.querySelectorAll('li').length).toBe(3);
    expect(el.textContent).toContain('Completada:');
    expect(el.textContent).toContain('3');
    expect(el.querySelector('[aria-current="step"]')?.textContent).toContain('Acta');
    expect(el.querySelector('button')).toBeNull();
  });

  it('navegable: cada paso es un botón que emite su clave', () => {
    const fixture = crear(true);
    const claves: string[] = [];
    fixture.componentInstance.stepClick.subscribe(k => claves.push(k));
    const botones = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    botones[2].click();
    expect(claves).toEqual(['c']);
    expect(botones[1].getAttribute('aria-current')).toBe('step');
  });
});

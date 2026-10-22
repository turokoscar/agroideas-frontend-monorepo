import { TestBed } from '@angular/core/testing';
import { UiStatusPillComponent } from './ui-status-pill.component';

describe('UiStatusPillComponent', () => {
  const crear = (entradas: Partial<UiStatusPillComponent>) => {
    const fixture = TestBed.createComponent(UiStatusPillComponent);
    Object.assign(fixture.componentInstance, entradas);
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('.status-pill') as HTMLElement;
  };

  it('colorea por estado conocido', () => {
    const pill = crear({ status: 'Aprobado' });
    expect(pill.getAttribute('data-status')).toBe('Aprobado');
    expect(pill.getAttribute('data-tone')).toBeNull();
    expect(pill.textContent).toContain('Aprobado');
  });

  it('con tono, colorea por tono y muestra el texto del host', () => {
    const pill = crear({ tone: 'warning', text: 'Observado por la UAJ' });
    expect(pill.getAttribute('data-tone')).toBe('warning');
    expect(pill.getAttribute('data-status')).toBeNull();
    expect(pill.textContent).toContain('Observado por la UAJ');
  });
});

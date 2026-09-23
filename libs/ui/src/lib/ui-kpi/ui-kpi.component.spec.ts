import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KpiVariant, UiKpiComponent } from './ui-kpi.component';

describe('UiKpiComponent', () => {
  let fixture: ComponentFixture<UiKpiComponent>;
  let el: HTMLElement;

  const card = () => el.querySelector('.kpi-card') as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [UiKpiComponent] }).compileComponents();
    fixture = TestBed.createComponent(UiKpiComponent);
    el = fixture.nativeElement;
    fixture.componentRef.setInput('label', 'Saldo Disponible');
    fixture.componentRef.setInput('value', 'S/ 1,000.00');
    fixture.detectChanges();
  });

  it('renders label, value and optional subtitle', () => {
    expect(el.textContent).toContain('Saldo Disponible');
    expect(el.textContent).toContain('S/ 1,000.00');
    expect(el.textContent).not.toContain('por ejecutar');

    fixture.componentRef.setInput('subtitle', '92% por ejecutar');
    fixture.detectChanges();
    expect(el.textContent).toContain('92% por ejecutar');
  });

  it('renders the icon when provided', () => {
    expect(el.querySelector('.material-symbols-outlined')).toBeNull();

    fixture.componentRef.setInput('icon', 'payments');
    fixture.detectChanges();

    const badge = el.querySelector('.kpi-icon');
    expect(badge?.textContent?.trim()).toBe('payments');
    expect(badge?.getAttribute('aria-hidden')).toBe('true');
    // El glifo va dentro del contenedor que centra, no en el mismo elemento.
    expect(badge?.classList).not.toContain('material-symbols-outlined');
    expect(badge?.querySelector('.material-symbols-outlined')).not.toBeNull();
  });

  it('fills the grid cell height so cards in a row match', () => {
    expect(card().classList).toContain('h-full');
    expect(card().classList).toContain('flex-col');
  });

  it('aligns every accented variant with the same left border, including primary', () => {
    const accented: KpiVariant[] = ['default', 'success', 'warning', 'danger', 'info', 'primary', 'dark'];
    for (const variant of accented) {
      fixture.componentRef.setInput('variant', variant);
      fixture.detectChanges();
      expect(card().classList).toContain('border-l-4');
    }
  });

  it('uses theme token classes instead of inline colors', () => {
    fixture.componentRef.setInput('variant', 'success');
    fixture.detectChanges();

    expect(card().classList).toContain('bg-success-soft');
    expect(card().getAttribute('style') ?? '').not.toMatch(/color|border/);
  });

  it('pins the progress bar to the bottom and clamps it to [0, 100]', () => {
    fixture.componentRef.setInput('showProgress', true);
    fixture.componentRef.setInput('progress', 140);
    fixture.detectChanges();

    const bar = el.querySelector('[role="progressbar"]') as HTMLElement;
    expect(bar.parentElement?.classList).toContain('mt-auto');
    expect(bar.getAttribute('aria-valuenow')).toBe('100');
    expect((bar.firstElementChild as HTMLElement).style.width).toBe('100%');

    fixture.componentRef.setInput('progress', -5);
    fixture.detectChanges();
    expect(bar.getAttribute('aria-valuenow')).toBe('0');
  });

  it('renders trend value, icon and label', () => {
    fixture.componentRef.setInput('trend', 'up');
    fixture.componentRef.setInput('trendValue', '+12%');
    fixture.componentRef.setInput('trendLabel', 'vs mes anterior');
    fixture.detectChanges();

    expect(el.textContent).toContain('arrow_upward');
    expect(el.textContent).toContain('+12%');
    expect(el.textContent).toContain('vs mes anterior');
  });
});

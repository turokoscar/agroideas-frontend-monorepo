import { TestBed } from '@angular/core/testing';
import { ToastService } from '@agroideas/ui';
import { SelectorPdfComponent } from './selector-pdf.component';

describe('SelectorPdfComponent', () => {
  const toast = { error: jest.fn() };

  function crear() {
    TestBed.configureTestingModule({ imports: [SelectorPdfComponent], providers: [{ provide: ToastService, useValue: toast }] });
    const fixture = TestBed.createComponent(SelectorPdfComponent);
    fixture.componentRef.setInput('etiqueta', 'Informe Legal');
    fixture.detectChanges();
    return fixture.componentInstance;
  }
  const evento = (f: File) => ({ target: { files: [f], value: 'x' } }) as unknown as Event;

  beforeEach(() => jest.clearAllMocks());

  it('acepta un PDF', () => {
    const c = crear();
    const pdf = new File(['%PDF-'], 'informe.pdf', { type: 'application/pdf' });
    c.seleccionar(evento(pdf));
    expect(c.archivo()).toBe(pdf);
  });

  it('rechaza otro formato o un PDF que supera el tamaño configurado', () => {
    const c = crear();
    c.seleccionar(evento(new File(['x'], 'foto.png', { type: 'image/png' })));
    const grande = new File(['%PDF-'], 'grande.pdf', { type: 'application/pdf' });
    Object.defineProperty(grande, 'size', { value: 50 * 1024 * 1024 });
    c.seleccionar(evento(grande));
    expect(c.archivo()).toBeNull();
    expect(toast.error).toHaveBeenCalledTimes(2);
  });
});

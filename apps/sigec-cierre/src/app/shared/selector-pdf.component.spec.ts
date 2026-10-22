import { TestBed } from '@angular/core/testing';
import { ToastService, UiDropzoneComponent } from '@agroideas/ui';
import { By } from '@angular/platform-browser';
import { SelectorPdfComponent } from './selector-pdf.component';
import { environment } from '../../environments/environment';

describe('SelectorPdfComponent', () => {
  const toast = { error: jest.fn() };

  function crear() {
    TestBed.configureTestingModule({ imports: [SelectorPdfComponent], providers: [{ provide: ToastService, useValue: toast }] });
    const fixture = TestBed.createComponent(SelectorPdfComponent);
    fixture.componentRef.setInput('etiqueta', 'Informe Legal');
    fixture.detectChanges();
    const zona = fixture.debugElement.query(By.directive(UiDropzoneComponent)).componentInstance as UiDropzoneComponent;
    const soltar = (archivo: File) =>
      zona.onDrop({ preventDefault: () => undefined, dataTransfer: { files: [archivo] } } as unknown as DragEvent);
    return { fixture, c: fixture.componentInstance, zona, soltar };
  }

  beforeEach(() => jest.clearAllMocks());

  it('usa ui-dropzone de un solo archivo con el tamaño máximo configurado', () => {
    const { zona } = crear();
    expect(zona.multiple()).toBe(false);
    expect(zona.maxMB()).toBe(environment.archivos.tamanoMaximoPdfMb);
  });

  it('acepta un PDF y lo muestra como archivo elegido', () => {
    const { fixture, c, soltar } = crear();
    const pdf = new File(['%PDF-'], 'informe.pdf', { type: 'application/pdf' });
    soltar(pdf);
    fixture.detectChanges();
    expect(c.archivo()).toBe(pdf);
    expect(fixture.nativeElement.querySelector('ui-dropzone')).toBeNull();
  });

  it('avisa si el archivo es de otro formato o supera el tamaño', () => {
    const { c, soltar } = crear();
    soltar(new File(['x'], 'foto.png', { type: 'image/png' }));
    const grande = new File(['%PDF-'], 'grande.pdf', { type: 'application/pdf' });
    Object.defineProperty(grande, 'size', { value: 50 * 1024 * 1024 });
    soltar(grande);
    expect(c.archivo()).toBeNull();
    expect(toast.error).toHaveBeenCalledWith('Formato no permitido', 'Adjunte informe legal en PDF.');
    expect(toast.error).toHaveBeenCalledWith('Archivo muy grande', expect.stringContaining('MB'));
  });
});

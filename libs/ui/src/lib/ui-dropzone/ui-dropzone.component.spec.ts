import { TestBed } from '@angular/core/testing';
import { FileInfo, FileRejection, UiDropzoneComponent } from './ui-dropzone.component';

describe('UiDropzoneComponent', () => {
  const crear = () => {
    const fixture = TestBed.createComponent(UiDropzoneComponent);
    fixture.componentRef.setInput('maxMB', 1);
    fixture.componentRef.setInput('label', 'Adjuntar la RDE');
    fixture.detectChanges();
    const aceptados: FileInfo[] = [];
    const rechazados: FileRejection[] = [];
    fixture.componentInstance.onFile.subscribe(f => aceptados.push(f));
    fixture.componentInstance.onReject.subscribe(r => rechazados.push(r));
    return { fixture, aceptados, rechazados };
  };

  const soltar = (fixture: ReturnType<typeof crear>['fixture'], archivos: File[]) =>
    fixture.componentInstance.onDrop({ preventDefault: () => undefined, dataTransfer: { files: archivos } } as unknown as DragEvent);

  it('acepta un PDF y avisa los rechazados por tipo o tamaño', () => {
    const { fixture, aceptados, rechazados } = crear();
    soltar(fixture, [
      new File(['%PDF-'], 'rde.pdf', { type: 'application/pdf' }),
      new File(['x'], 'foto.png', { type: 'image/png' }),
      new File([new Uint8Array(2 * 1024 * 1024)], 'grande.pdf', { type: 'application/pdf' })
    ]);
    expect(aceptados.map(a => a.name)).toEqual(['rde.pdf']);
    expect(rechazados).toEqual([{ name: 'foto.png', reason: 'type' }, { name: 'grande.pdf', reason: 'size' }]);
  });

  it('es un botón accesible por teclado', () => {
    const { fixture } = crear();
    const zona = fixture.nativeElement.querySelector('[role="button"]') as HTMLElement;
    expect(zona.getAttribute('tabindex')).toBe('0');
    expect(zona.getAttribute('aria-label')).toBe('Adjuntar la RDE');
    const clic = jest.spyOn(fixture.nativeElement.querySelector('input[type="file"]') as HTMLInputElement, 'click');
    zona.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(clic).toHaveBeenCalled();
  });
});

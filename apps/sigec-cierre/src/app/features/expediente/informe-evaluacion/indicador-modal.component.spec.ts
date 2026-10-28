import { TestBed } from '@angular/core/testing';
import { IndicadorModalComponent } from './indicador-modal.component';
import { IndicadorEvaluacionDto, nuevoIndicador } from '../../../core/models/anexo22.model';

describe('IndicadorModalComponent', () => {
  function crear(fila: IndicadorEvaluacionDto, soloTextos = false) {
    TestBed.configureTestingModule({ imports: [IndicadorModalComponent] });
    const fixture = TestBed.createComponent(IndicadorModalComponent);
    fixture.componentRef.setInput('fila', fila);
    fixture.componentRef.setInput('soloTextos', soloTextos);
    fixture.componentRef.setInput('columnaExtra', soloTextos ? 'actividad' : 'destino');
    fixture.detectChanges();
    return fixture;
  }

  it('una fila nueva exige el concepto y lo marca en su campo al intentar aceptar', () => {
    const fila = nuevoIndicador(1);
    const fixture = crear(fila);
    const c = fixture.componentInstance;
    const emitidas: IndicadorEvaluacionDto[] = [];
    c.guardar.subscribe(f => emitidas.push(f));
    expect(c.errorConcepto()).toBeNull();

    c.aceptar();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(emitidas).toEqual([]);
    expect(el.querySelector('#ind-concepto')?.getAttribute('aria-invalid')).toBe('true');
    expect(el.querySelector('#ind-concepto-error')?.textContent).toContain('Indique el indicador o concepto.');

    fila.txtConcepto = 'Precio en chacra';
    c.aceptar();
    expect(emitidas).toEqual([fila]);
  });

  it('con el catálogo del SEL, la unidad se elige y los textos largos van en textarea', () => {
    TestBed.configureTestingModule({ imports: [IndicadorModalComponent] });
    const fixture = TestBed.createComponent(IndicadorModalComponent);
    fixture.componentRef.setInput('fila', nuevoIndicador(1));
    fixture.componentRef.setInput('unidadesMedida', ['Kilogramo (kg)', 'SOLES (S/.)']);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const unidad = el.querySelector('#ind-unidad') as HTMLSelectElement;
    expect(unidad.tagName).toBe('SELECT');
    expect(Array.from(unidad.options).map(o => o.textContent?.trim())).toEqual(['Seleccione una unidad…', 'Kilogramo (kg)', 'SOLES (S/.)']);
    expect(el.querySelector('#ind-medio')?.tagName).toBe('TEXTAREA');
    expect(el.querySelector('#ind-comentarios')?.tagName).toBe('TEXTAREA');
  });

  it('muestra la variación de cada año mientras se escribe', () => {
    const fixture = crear({ ...nuevoIndicador(1), txtConcepto: 'Ventas', numProgAnio2: 100, numEjecAnio2: 70 });
    expect(fixture.nativeElement.textContent).toContain('-30 %');
  });

  it('en una fila del SEL (sección VI) solo se editan actividad y comentarios', async () => {
    const fixture = crear({ ...nuevoIndicador(1), txtConcepto: 'Compost', txtOrigen: 'SEL_GENERAL+RTF' }, true);
    // ngModel aplica el disabled de forma asíncrona.
    await fixture.whenStable();
    fixture.detectChanges();
    const habilitados = (Array.from(fixture.nativeElement.querySelectorAll('input, textarea')) as HTMLInputElement[])
      .filter(i => !i.disabled)
      .map(i => i.id);
    expect(habilitados).toEqual(['ind-actividad', 'ind-comentarios']);
    expect(fixture.componentInstance.valido()).toBe(true);
  });

  it('unidad, línea base y resultado van en una fila; medio de verificación y comentarios, uno debajo del otro', () => {
    const fixture = crear({ ...nuevoIndicador(1), txtConcepto: 'Ventas', txtUnidadMedida: 'Kilogramo (kg)', numLineaBase: 100, numResultado: 80 });
    const el = fixture.nativeElement as HTMLElement;
    const campo = (id: string) => el.querySelector('#' + id)?.closest('.form-field') as HTMLElement;

    const fila = campo('ind-unidad').parentElement as HTMLElement;
    expect(fila.className).toContain('sm:grid-cols-3');
    expect([campo('ind-lb'), campo('ind-resultado')].every(c => c.parentElement === fila)).toBe(true);

    const sustento = campo('ind-medio').parentElement as HTMLElement;
    expect(campo('ind-comentarios').parentElement).toBe(sustento);
    expect(sustento.className).not.toContain('grid-cols-2');

    expect(el.querySelector('thead')?.textContent).toContain('Programado (Kilogramo (kg))');
    expect(el.querySelector('tfoot')?.textContent).toContain('-20 %');
  });
});

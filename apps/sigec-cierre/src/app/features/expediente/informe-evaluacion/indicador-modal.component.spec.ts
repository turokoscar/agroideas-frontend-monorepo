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

  it('una fila nueva exige el concepto', () => {
    const fila = nuevoIndicador(1);
    const { componentInstance: c } = crear(fila);
    expect(c.valido()).toBe(false);
    fila.txtConcepto = 'Precio en chacra';
    expect(c.valido()).toBe(true);
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
    const habilitados = (Array.from(fixture.nativeElement.querySelectorAll('input')) as HTMLInputElement[])
      .filter(i => !i.disabled)
      .map(i => i.id);
    expect(habilitados).toEqual(['ind-actividad', 'ind-comentarios']);
    expect(fixture.componentInstance.valido()).toBe(true);
  });
});

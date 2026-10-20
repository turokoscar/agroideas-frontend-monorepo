import { TestBed } from '@angular/core/testing';
import { TablaIndicadoresComponent } from './tabla-indicadores.component';
import { IndicadorEvaluacionDto, nuevoIndicador } from '../../../core/models/anexo22.model';

describe('TablaIndicadoresComponent', () => {
  function crear(filas: IndicadorEvaluacionDto[], soloLectura = false) {
    TestBed.configureTestingModule({ imports: [TablaIndicadoresComponent] });
    const fixture = TestBed.createComponent(TablaIndicadoresComponent);
    fixture.componentRef.setInput('filas', filas);
    fixture.componentRef.setInput('soloLectura', soloLectura);
    fixture.detectChanges();
    return fixture;
  }

  const delSistema: IndicadorEvaluacionDto = {
    ...nuevoIndicador(1), txtConcepto: 'Rendimiento de café', txtUnidadMedida: 'qq/ha', numLineaBase: 15,
    numProgAnio1: 18, numEjecAnio1: 12, ideIndicadorSel: 501, txtOrigen: 'SEL_GENERAL+RTF'
  };

  it('las filas del sistema no se editan y muestran su origen', () => {
    const el: HTMLElement = crear([delSistema]).nativeElement;
    expect(el.querySelectorAll('input').length).toBe(0);
    expect(el.textContent).toContain('Rendimiento de café');
    expect(el.textContent).toContain('SEL + RTF');
  });

  it('resalta la desviación crítica (12 frente a 18 programado: −33,33 %)', () => {
    const el: HTMLElement = crear([delSistema]).nativeElement;
    expect(el.querySelector('tbody tr')?.className).toContain('bg-destructive/5');
    expect(el.textContent).toContain('-33.33 %');
  });

  it('las filas manuales se editan y se pueden quitar', () => {
    const fixture = crear([{ ...nuevoIndicador(1), txtConcepto: 'Precio en chacra' }]);
    const quitar = jest.fn();
    fixture.componentInstance.quitar.subscribe(quitar);
    expect(fixture.nativeElement.querySelectorAll('input').length).toBeGreaterThan(5);
    (fixture.nativeElement.querySelector('ui-button button') as HTMLButtonElement).click();
    expect(quitar).toHaveBeenCalledWith(0);
  });

  it('en solo lectura (informe firmado) nada se edita', () => {
    expect(crear([nuevoIndicador(1)], true).nativeElement.querySelectorAll('input').length).toBe(0);
  });
});

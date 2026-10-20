import { TestBed } from '@angular/core/testing';
import { TablaIndicadoresComponent, ColumnaExtra } from './tabla-indicadores.component';
import { IndicadorEvaluacionDto, nuevoIndicador } from '../../../core/models/anexo22.model';

describe('TablaIndicadoresComponent', () => {
  function crear(filas: IndicadorEvaluacionDto[], soloLectura = false, columnaExtra: ColumnaExtra = null) {
    TestBed.configureTestingModule({ imports: [TablaIndicadoresComponent] });
    const fixture = TestBed.createComponent(TablaIndicadoresComponent);
    fixture.componentRef.setInput('filas', filas);
    fixture.componentRef.setInput('soloLectura', soloLectura);
    fixture.componentRef.setInput('columnaExtra', columnaExtra);
    fixture.detectChanges();
    return fixture;
  }

  const botones = (el: HTMLElement) => Array.from(el.querySelectorAll('ui-button button')) as HTMLButtonElement[];

  const delSistema: IndicadorEvaluacionDto = {
    ...nuevoIndicador(1), txtConcepto: 'Rendimiento de café', txtUnidadMedida: 'qq/ha', numLineaBase: 15,
    numProgAnio1: 18, numEjecAnio1: 12, ideIndicadorSel: 501, txtOrigen: 'SEL_GENERAL+RTF'
  };

  it('es de solo lectura: no tiene campos en línea (la edición va en el modal)', () => {
    const el: HTMLElement = crear([delSistema, { ...nuevoIndicador(2), txtConcepto: 'Precio en chacra' }]).nativeElement;
    expect(el.querySelectorAll('input').length).toBe(0);
    expect(el.textContent).toContain('SEL + RTF');
  });

  it('resalta la desviación crítica (12 frente a 18 programado: −33,33 %)', () => {
    const el: HTMLElement = crear([delSistema]).nativeElement;
    expect(el.querySelector('tbody tr')?.className).toContain('bg-destructive/5');
    expect(el.textContent).toContain('-33.33 %');
  });

  it('las filas manuales se editan y se quitan', () => {
    const fixture = crear([{ ...nuevoIndicador(1), txtConcepto: 'Precio en chacra' }]);
    const editar = jest.fn();
    const quitar = jest.fn();
    fixture.componentInstance.editar.subscribe(editar);
    fixture.componentInstance.quitar.subscribe(quitar);
    const [botonEditar, botonQuitar] = botones(fixture.nativeElement);
    botonEditar.click();
    botonQuitar.click();
    expect(editar).toHaveBeenCalledWith(0);
    expect(quitar).toHaveBeenCalledWith(0);
  });

  it('las filas del sistema no se editan, salvo en la sección VI (actividad y comentarios), y nunca se quitan', () => {
    expect(botones(crear([delSistema]).nativeElement).length).toBe(0);
    TestBed.resetTestingModule();
    expect(botones(crear([delSistema], false, 'actividad').nativeElement).map(b => b.getAttribute('aria-label'))).toEqual(['Editar la fila 1']);
  });

  it('en solo lectura (informe firmado) no hay acciones', () => {
    expect(botones(crear([nuevoIndicador(1)], true).nativeElement).length).toBe(0);
  });
});

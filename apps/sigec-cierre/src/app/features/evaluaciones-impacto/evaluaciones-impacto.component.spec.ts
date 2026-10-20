import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ToastService } from '@agroideas/ui';
import { CierreApiService } from '../../core/services/cierre-api.service';
import { EvaluacionImpactoDto, IndicadorImpactoDto } from '../../core/models/evaluacion-impacto.model';
import { EvaluacionesImpactoComponent } from './evaluaciones-impacto.component';

const indicador = (flgDesviacionCritica: boolean): IndicadorImpactoDto => ({
  tipSeccion: 'PRODUCCION', txtConcepto: 'Producción de café', txtUnidadMedida: 't', ideIndicadorSel: 1, numLineaBase: 10,
  programado: [12, 14, 16], ejecutado: [11, 13, 9], variacionAnual: [-8.33, -7.14, -43.75], numEjecutadoCierre: 9,
  pctVariacionLineaBase: -10, flgDesviacionCritica
});
const evaluacion: EvaluacionImpactoDto = {
  ideCierreConvenio: 6, ideConvenio: 13348, txtNumeroConvenio: '0012-2023', txtOrganizacion: 'Cooperativa Café Sur',
  txtCadenaProductiva: 'Café', txtRegion: 'Junín', txtProvincia: null, txtDistrito: null, canSociasMujeres: 10,
  canSociosHombres: 20, numSocios: 30, numHectareas: 45.5, tipResultado: 'CON_OBSERVACIONES', fecFirma: '2026-10-15T10:00:00',
  indicadores: [indicador(true), indicador(false)]
};

describe('EvaluacionesImpactoComponent', () => {
  const api = { listarEvaluacionesImpacto: jest.fn() };

  function crear() {
    TestBed.configureTestingModule({
      imports: [EvaluacionesImpactoComponent],
      providers: [{ provide: CierreApiService, useValue: api }, { provide: ToastService, useValue: { error: jest.fn() } }]
    });
    const fixture = TestBed.createComponent(EvaluacionesImpactoComponent);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    api.listarEvaluacionesImpacto.mockReturnValue(of({ items: [evaluacion], total: 1, pagina: 1, cantidad: 20 }));
  });

  it('lista los Anexos 22 firmados con resultado y desviaciones críticas', () => {
    const texto = crear().nativeElement.textContent as string;
    expect(texto).toContain('0012-2023');
    expect(texto).toContain('Convenio Ejecutado con Observaciones');
    expect(api.listarEvaluacionesImpacto).toHaveBeenCalledWith(expect.objectContaining({ pagina: 1 }));
  });

  it('filtra por cadena y región, y expande los indicadores', () => {
    const fixture = crear();
    const c = fixture.componentInstance;
    c.cadena = 'Café';
    c.region = 'Junín';
    c.buscar(1);
    expect(api.listarEvaluacionesImpacto).toHaveBeenLastCalledWith(expect.objectContaining({ cadena: 'Café', region: 'Junín' }));

    c.alternar(6);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Producción de café');
  });
});

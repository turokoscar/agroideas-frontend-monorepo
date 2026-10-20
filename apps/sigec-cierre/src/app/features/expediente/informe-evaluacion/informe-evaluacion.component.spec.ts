import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ToastService } from '@agroideas/ui';
import { InformeEvaluacionComponent } from './informe-evaluacion.component';
import { CierreApiService } from '../../../core/services/cierre-api.service';
import { Anexo22Dto } from '../../../core/models/anexo22.model';
import { PlazoDto } from '../../../core/models/plazo.model';

function anexo(extra: Partial<Anexo22Dto> = {}): Anexo22Dto {
  return {
    ideAnexo22: 0, ideCierreConvenio: 5, estAnexo22: 'BORRADOR', numVersion: 1, ideUsuario: 0,
    fecRegistro: '2026-10-20T00:00:00', fecModificacion: '2026-10-20T00:00:00', faltantes: ['VII. Logros'],
    txtOrganizacion: 'Cooperativa Bio Coffee Perú', txtPlanNegocio: 'Mejora del café', txtRegion: 'Junín', txtProvincia: 'Chanchamayo',
    txtDistrito: 'Perené', txtCentroPoblado: null, txtNumeroConvenio: '319', fecInicioConvenio: null, fecFinConvenio: null,
    fecTerminoAdenda: null, txtCadenaProductiva: 'Café', canSociasMujeres: 10, canSociosHombres: 20, numHectareas: 50,
    codRuc: '20602684726', problematica: [], txtObjetivoGeneral: null, txtObjetivosEspecificos: null,
    produccion: [], txtAnalisisProduccion: null, precios: [], txtAnalisisPrecios: null, comercializacion: [],
    txtAnalisisComercializacion: null, ingresos: [], txtAnalisisIngresos: null, objetivosEspecificos: [],
    txtAnalisisObjetivos: null,
    financiamiento: [{ tipFuente: 'AGROIDEAS', impAprobado: 350000, impEjecutado: 300000, txtOrigen: 'SEL_GENERAL+KOFIX' }],
    txtAnalisisFinanciamiento: null, bienes: [], servicios: [], txtAnalisisItems: null, monitoreo: [], practicaAmbiental: [],
    txtLogros: null, txtLeccionesAprendidas: null, txtDificultades: null, txtConclusiones: null, txtRecomendaciones: null,
    tipResultado: null,
    ...extra
  };
}

const plazo = (fecLimite: string): PlazoDto => ({
  idePlazo: 1, ideCierreConvenio: 5, tipPlazo: 'EVALUACION_UN', fecInicio: '2026-07-01T00:00:00', canDias: 90, fecLimite,
  codDepartamento: null, codProvincia: null, estPlazo: 'VIGENTE', fecCierre: null, txtContingencia: null, fecRegistro: '2026-07-01T00:00:00'
});

describe('InformeEvaluacionComponent', () => {
  const api = {
    obtenerAnexo22: jest.fn(), listarVersionesAnexo22: jest.fn(), guardarAnexo22: jest.fn(),
    descargarAnexo22: jest.fn(), presentarAnexo22: jest.fn(), derivar: jest.fn()
  };
  const toast = { success: jest.fn(), info: jest.fn(), error: jest.fn() };

  function crear(plazoUn: PlazoDto | null = null) {
    TestBed.configureTestingModule({
      imports: [InformeEvaluacionComponent],
      providers: [{ provide: CierreApiService, useValue: api }, { provide: ToastService, useValue: toast }]
    });
    const fixture = TestBed.createComponent(InformeEvaluacionComponent);
    fixture.componentRef.setInput('ideCierre', 5);
    fixture.componentRef.setInput('plazoUn', plazoUn);
    fixture.detectChanges();
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    api.obtenerAnexo22.mockReturnValue(of(anexo()));
    api.listarVersionesAnexo22.mockReturnValue(of([]));
  });

  it('carga la propuesta, muestra lo que falta y los datos del SEL', () => {
    const el: HTMLElement = crear().nativeElement;
    expect(api.obtenerAnexo22).toHaveBeenCalledWith(5);
    expect(el.textContent).toContain('Cooperativa Bio Coffee Perú');
    expect(el.textContent).toContain('VII. Logros');
  });

  it('agrega filas manuales numeradas en las secciones sin fuente definida', () => {
    const { componentInstance: c } = crear();
    c.agregarFila('precios');
    c.agregarFila('precios');
    c.quitarFila('precios', 0);
    expect(c.anexo()?.precios.map(p => p.numOrden)).toEqual([1]);
    expect(c.anexo()?.precios[0].txtOrigen).toBe('MANUAL');
    expect(c.sucio()).toBe(true);
  });

  it('de la contrapartida solo se edita lo ejecutado; el aprobado viene del SEL', () => {
    api.obtenerAnexo22.mockReturnValue(
      of(anexo({
        financiamiento: [
          { tipFuente: 'AGROIDEAS', impAprobado: 285132, impEjecutado: 200000, txtOrigen: 'SEL_GENERAL+KOFIX' },
          { tipFuente: 'ORGANIZACION', impAprobado: 71283, impEjecutado: 0, txtOrigen: 'SEL_GENERAL+MANUAL' }
        ]
      }))
    );
    const el: HTMLElement = crear().nativeElement;
    expect(el.querySelector('input[aria-label="Aprobado de la organización"]')).toBeNull();
    expect(el.querySelector('input[aria-label="Ejecutado de la organización"]')).not.toBeNull();
    expect(el.textContent).toContain('71,283.00');
    expect(el.textContent).toContain('SEL + UN');
  });

  it('presentar exige el informe guardado, completo y el PDF; luego avisa al expediente', () => {
    api.guardarAnexo22.mockReturnValue(of(anexo({ ideAnexo22: 9, faltantes: [] })));
    api.presentarAnexo22.mockReturnValue(of({ ideCierreConvenio: 5 }));
    const { componentInstance: c } = crear();
    const cambio = jest.fn();
    c.cambio.subscribe(cambio);

    c.marcarSucio();
    c.guardar();
    expect(c.completo()).toBe(true);

    const pdf = new File(['%PDF-'], 'anexo22.pdf', { type: 'application/pdf' });
    c.seleccionarArchivo({ target: { files: [pdf], value: 'x' } } as unknown as Event);
    c.presentar();

    expect(api.presentarAnexo22).toHaveBeenCalledWith(5, pdf);
    expect(cambio).toHaveBeenCalled();
  });

  it('firmado queda en solo lectura y ofrece derivar a la DE', () => {
    api.obtenerAnexo22.mockReturnValue(of(anexo({ ideAnexo22: 9, faltantes: [], estAnexo22: 'FIRMADO' })));
    const fixture = crear();
    expect(fixture.componentInstance.firmado()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Derivar a la Dirección Ejecutiva');
    expect(fixture.nativeElement.textContent).not.toContain('Guardar informe');
  });

  it('con el plazo de la UN vencido, derivar exige la contingencia', () => {
    api.obtenerAnexo22.mockReturnValue(of(anexo({ ideAnexo22: 9, faltantes: [], estAnexo22: 'FIRMADO' })));
    api.derivar.mockReturnValue(of({ ideCierreConvenio: 5, estCierre: 'DERIVADO_DE' }));
    const { componentInstance: c } = crear(plazo('2026-01-01T23:59:59'));
    expect(c.plazoVencido()).toBe(true);

    c.abrirDerivar();
    c.derivar();
    expect(api.derivar).not.toHaveBeenCalled();

    c.contingencia = 'Demora en la información de KOFIX';
    c.derivar();
    expect(api.derivar).toHaveBeenCalledWith(5, 'DE', 'Demora en la información de KOFIX');
  });

  it('dentro del plazo deriva sin contingencia', () => {
    api.obtenerAnexo22.mockReturnValue(of(anexo({ ideAnexo22: 9, faltantes: [], estAnexo22: 'FIRMADO' })));
    api.derivar.mockReturnValue(of({ ideCierreConvenio: 5 }));
    const { componentInstance: c } = crear(plazo('2099-12-31T23:59:59'));
    c.abrirDerivar();
    c.derivar();
    expect(api.derivar).toHaveBeenCalledWith(5, 'DE', null);
  });
});

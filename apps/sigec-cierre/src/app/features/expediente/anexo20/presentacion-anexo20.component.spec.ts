import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ToastService } from '@agroideas/ui';
import { CierreApiService } from '../../../core/services/cierre-api.service';
import { Anexo20ResumenDto } from '../../../core/models/anexo20.model';
import { PlazoDto } from '../../../core/models/plazo.model';
import { PresentacionAnexo20Component } from './presentacion-anexo20.component';

const resumen = (extra: Partial<Anexo20ResumenDto> = {}): Anexo20ResumenDto => ({
  ideAnexo20: 4, ideConvenio: 2388, estAnexo20: 'BORRADOR', numAnexo20: '001-2026', faltantes: [], ...extra
});
const plazo = (fecLimite: string): PlazoDto => ({
  idePlazo: 1, ideCierreConvenio: 5, tipPlazo: 'ANEXO20', fecInicio: '2026-10-01T00:00:00', canDias: 30, fecLimite,
  codDepartamento: null, codProvincia: null, estPlazo: 'VIGENTE', fecCierre: null, txtContingencia: null, fecRegistro: '2026-10-01T00:00:00'
});

describe('PresentacionAnexo20Component', () => {
  const api = { obtenerAnexo20: jest.fn(), descargarFormularioAnexo20: jest.fn(), presentarAnexo20: jest.fn() };
  const toast = { success: jest.fn(), error: jest.fn() };

  function crear(plazoAnexo20: PlazoDto | null = plazo('2099-12-31T23:59:59')) {
    TestBed.configureTestingModule({
      imports: [PresentacionAnexo20Component],
      providers: [{ provide: CierreApiService, useValue: api }, { provide: ToastService, useValue: toast }]
    });
    const fixture = TestBed.createComponent(PresentacionAnexo20Component);
    fixture.componentRef.setInput('ideCierre', 5);
    fixture.componentRef.setInput('ideConvenio', 2388);
    fixture.componentRef.setInput('plazo', plazoAnexo20);
    fixture.detectChanges();
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => jest.clearAllMocks());

  it('con el formulario completo de la OA, la UN presenta el PDF firmado', () => {
    api.obtenerAnexo20.mockReturnValue(of(resumen()));
    api.presentarAnexo20.mockReturnValue(of({}));
    const c = crear().componentInstance;
    const cambio = jest.fn();
    c.cambio.subscribe(cambio);
    expect(api.obtenerAnexo20).toHaveBeenCalledWith(2388);
    expect(c.formularioCompleto()).toBe(true);

    const pdf = new File(['%PDF-'], 'anexo20-firmado.pdf', { type: 'application/pdf' });
    c.firmado.set(pdf);
    c.presentar();
    expect(api.presentarAnexo20).toHaveBeenCalledWith(5, pdf);
    expect(cambio).toHaveBeenCalled();
  });

  it('si la OA no completó el formulario, dice qué falta y no deja presentar', () => {
    api.obtenerAnexo20.mockReturnValue(of(resumen({ ideAnexo20: 0, faltantes: ['IV. Metas (al menos una)'] })));
    const fixture = crear();
    const c = fixture.componentInstance;
    expect(c.formularioCompleto()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('IV. Metas (al menos una)');
    c.firmado.set(new File(['%PDF-'], 'a.pdf', { type: 'application/pdf' }));
    c.presentar();
    expect(api.presentarAnexo20).not.toHaveBeenCalled();
  });

  it('con el plazo vencido avisa que sigue de oficio y no ofrece la carga', () => {
    api.obtenerAnexo20.mockReturnValue(of(resumen()));
    const fixture = crear(plazo('2020-01-01T23:59:59'));
    expect(fixture.componentInstance.vencido()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('continúa de oficio');
    expect(fixture.nativeElement.querySelector('app-selector-pdf')).toBeNull();
  });

  it('muestra el mensaje de la API si el formulario no se puede consultar', () => {
    api.obtenerAnexo20.mockReturnValue(throwError(() => ({ error: { mensaje: 'CIE_1001:Sin acceso al convenio.' } })));
    expect(crear().componentInstance.errorFormulario()).toBeTruthy();
  });

  it('el formulario sin firma se entrega al visor del expediente', () => {
    api.obtenerAnexo20.mockReturnValue(of(resumen()));
    const pdf = new Blob(['%PDF-'], { type: 'application/pdf' });
    api.descargarFormularioAnexo20.mockReturnValue(of(pdf));
    const c = crear().componentInstance;
    const ver = jest.fn();
    c.ver.subscribe(ver);
    c.verFormulario();
    expect(api.descargarFormularioAnexo20).toHaveBeenCalledWith(2388);
    expect(ver).toHaveBeenCalledWith({ nombre: 'Anexo20_001-2026_sin_firma.pdf', contenido: pdf });
  });
});


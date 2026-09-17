import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { OaObservacionesComponent } from './oa-observaciones.component';
import { RtfService } from '../../core/services/rtf.service';
import { environment } from '../../../environments/environment';
import { ApiResponse, EvaluacionUrEstadoDto, RtfCabeceraDto } from '../../core/models';

describe('OaObservacionesComponent', () => {
  let httpMock: HttpTestingController;
  let rtfService: RtfService;
  const apiUrl = environment.apiUrl;
  const ok = <T>(datos: T): ApiResponse<T> => ({ respuesta: 'OK', mensaje: 'OK', datos });

  function crearComponente(rtfId?: number) {
    TestBed.configureTestingModule({
      imports: [OaObservacionesComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    });
    httpMock = TestBed.inject(HttpTestingController);
    rtfService = TestBed.inject(RtfService);
    if (rtfId != null) rtfService.rtfId.set(rtfId);
    return TestBed.createComponent(OaObservacionesComponent);
  }

  afterEach(() => httpMock.verify());

  it('shows an error state and makes no requests when there is no rtfId in memory', () => {
    const fixture = crearComponente();
    fixture.detectChanges();

    expect(fixture.componentInstance.hasError()).toBe(true);
    expect(fixture.componentInstance.isLoading()).toBe(false);
  });

  it('loads the detail, the paso crítico metas/indicadores and the evaluación, then resolves item titles', () => {
    const fixture = crearComponente(55);
    fixture.detectChanges();

    httpMock.expectOne(`${apiUrl}/rtfs/55`).flush(ok<RtfCabeceraDto>({
      ideRtf: 55,
      ideConvenio: 1,
      numPasoCritico: 1,
      idePasoCritico: 900,
      fecInicioPeriodo: '2026-01-01',
      fecFinPeriodo: '2026-06-01',
      estRtf: 'OBSERVADO',
      fecHabilitacion: '2026-01-01',
      fecLimite: '2026-06-11'
    }));

    httpMock.expectOne(`${apiUrl}/pasos-criticos/900/metas?ideRtf=55`).flush(ok([
      { id: 7, marcoLogicoID: 1, pasoCriticoID: 900, metaFisicaProgramada: 10, metaFisicaEjecutada: 4, metaFinancieraProgramada: 0, metaFinancieraEjecutada: 0, descripcion: 'Instalación de secadoras solares' }
    ]));
    httpMock.expectOne(`${apiUrl}/pasos-criticos/900/indicadores?ideRtf=55`).flush(ok([
      { id: 23, pasoCriticoID: 900, postulanteIndicadorCadenaID: 1, indicador: 'Rendimiento de café pergamino', metaProgramada: 5, metaEjecutada: 2 }
    ]));

    httpMock.expectOne(`${apiUrl}/rtfs/55/evaluaciones`).flush(ok<EvaluacionUrEstadoDto>({
      pliegoObservaciones: 'texto colapsado',
      revisiones: [
        { ideRevision: 1, ideRtf: 55, txtSeccion: 'UR_META_7', estConformidad: 'OBSERVADO', txtObservacion: 'Falta evidencia fotográfica', txtCategoria: 'TECNICA_FISICA', estSubsanable: true, fecRegistro: '2026-09-16' },
        { ideRevision: 2, ideRtf: 55, txtSeccion: 'UR_INDICADOR_23', estConformidad: 'CONFORME', fecRegistro: '2026-09-16' },
        { ideRevision: 3, ideRtf: 55, txtSeccion: 'UR_R1_55', estConformidad: 'OBSERVADO', txtObservacion: 'Aclarar cambios reportados', txtCategoria: 'CUALITATIVA', estSubsanable: false, fecRegistro: '2026-09-16' }
      ]
    }));

    expect(fixture.componentInstance.isLoading()).toBe(false);
    expect(fixture.componentInstance.hasError()).toBe(false);

    const observaciones = fixture.componentInstance.observacionesPendientes();
    expect(observaciones).toHaveLength(2);
    expect(observaciones[0]).toMatchObject({ kind: 'META', titulo: 'Instalación de secadoras solares', subsanable: true });
    expect(observaciones[1]).toMatchObject({ kind: 'R1', titulo: 'Información cualitativa (R1)', subsanable: false });
  });

  it('falls back to a generic title when the meta/indicador is not found among the loaded ones', () => {
    const fixture = crearComponente(55);
    fixture.detectChanges();

    httpMock.expectOne(`${apiUrl}/rtfs/55`).flush(ok<RtfCabeceraDto>({
      ideRtf: 55, ideConvenio: 1, numPasoCritico: 1, idePasoCritico: 900,
      fecInicioPeriodo: '2026-01-01', fecFinPeriodo: '2026-06-01', estRtf: 'OBSERVADO',
      fecHabilitacion: '2026-01-01', fecLimite: '2026-06-11'
    }));
    httpMock.expectOne(`${apiUrl}/pasos-criticos/900/metas?ideRtf=55`).flush(ok([]));
    httpMock.expectOne(`${apiUrl}/pasos-criticos/900/indicadores?ideRtf=55`).flush(ok([]));
    httpMock.expectOne(`${apiUrl}/rtfs/55/evaluaciones`).flush(ok<EvaluacionUrEstadoDto>({
      pliegoObservaciones: '',
      revisiones: [{ ideRevision: 1, ideRtf: 55, txtSeccion: 'UR_META_999', estConformidad: 'OBSERVADO', fecRegistro: '2026-09-16' }]
    }));

    expect(fixture.componentInstance.observacionesPendientes()[0].titulo).toBe('Meta física #999');
  });

  it('sets hasError when loading the detail fails', () => {
    const fixture = crearComponente(55);
    fixture.detectChanges();

    httpMock.expectOne(`${apiUrl}/rtfs/55`).flush('boom', { status: 500, statusText: 'Server Error' });

    expect(fixture.componentInstance.hasError()).toBe(true);
    expect(fixture.componentInstance.isLoading()).toBe(false);
  });

  it('irACorregir navigates to the paso crítico registration route once it is known', () => {
    const fixture = crearComponente(55);
    fixture.detectChanges();
    httpMock.expectOne(`${apiUrl}/rtfs/55`).flush(ok<RtfCabeceraDto>({
      ideRtf: 55, ideConvenio: 1, numPasoCritico: 1, idePasoCritico: 900,
      fecInicioPeriodo: '2026-01-01', fecFinPeriodo: '2026-06-01', estRtf: 'OBSERVADO',
      fecHabilitacion: '2026-01-01', fecLimite: '2026-06-11'
    }));
    httpMock.expectOne(`${apiUrl}/pasos-criticos/900/metas?ideRtf=55`).flush(ok([]));
    httpMock.expectOne(`${apiUrl}/pasos-criticos/900/indicadores?ideRtf=55`).flush(ok([]));
    httpMock.expectOne(`${apiUrl}/rtfs/55/evaluaciones`).flush(ok<EvaluacionUrEstadoDto>({ pliegoObservaciones: '', revisiones: [] }));

    const router = TestBed.inject(Router);
    const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.componentInstance.irACorregir();

    expect(navigateSpy).toHaveBeenCalledWith(['/rtf/pasos-criticos', 900, 'registrar']);
  });

  it('volver navigates back to the bandeja', () => {
    const fixture = crearComponente();
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.componentInstance.volver();

    expect(navigateSpy).toHaveBeenCalledWith(['/rtf/bandeja']);
  });
});

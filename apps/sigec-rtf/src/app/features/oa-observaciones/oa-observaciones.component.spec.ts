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

  const rtfDetalle: RtfCabeceraDto = {
    ideRtf: 55, ideConvenio: 1, numPasoCritico: 1, idePasoCritico: 900,
    fecInicioPeriodo: '2026-01-01', fecFinPeriodo: '2026-06-01', estRtf: 'OBSERVADO',
    fecHabilitacion: '2026-01-01', fecLimite: '2026-06-11'
  };

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

  /** Deja el componente cargado con dos observaciones: una pendiente (ideRevision 21) y una ya atendida (22). */
  function cargarConDosObservaciones() {
    const fixture = crearComponente(55);
    fixture.detectChanges();

    httpMock.expectOne(`${apiUrl}/rtfs/55`).flush(ok(rtfDetalle));
    httpMock.expectOne(`${apiUrl}/pasos-criticos/900/metas?ideRtf=55`).flush(ok([]));
    httpMock.expectOne(`${apiUrl}/pasos-criticos/900/indicadores?ideRtf=55`).flush(ok([]));
    httpMock.expectOne(`${apiUrl}/rtfs/55/evaluaciones`).flush(ok<EvaluacionUrEstadoDto>({
      pliegoObservaciones: '',
      revisiones: [
        { ideRevision: 21, ideRtf: 55, txtSeccion: 'UR_META_1', estConformidad: 'OBSERVADO', txtObservacion: 'Falta evidencia', estAtencion: 'PENDIENTE', fecRegistro: '2026-09-16' },
        { ideRevision: 22, ideRtf: 55, txtSeccion: 'UR_META_2', estConformidad: 'OBSERVADO', txtObservacion: 'Corregir monto', estAtencion: 'ATENDIDA', txtRespuestaOa: 'Ya corregido', fecRegistro: '2026-09-16' }
      ]
    }));

    return fixture;
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

    httpMock.expectOne(`${apiUrl}/rtfs/55`).flush(ok(rtfDetalle));

    httpMock.expectOne(`${apiUrl}/pasos-criticos/900/metas?ideRtf=55`).flush(ok([
      { id: 7, marcoLogicoID: 1, pasoCriticoID: 900, metaFisicaProgramada: 10, metaFisicaEjecutada: 4, metaFinancieraProgramada: 0, metaFinancieraEjecutada: 0, descripcion: 'Instalación de secadoras solares' }
    ]));
    httpMock.expectOne(`${apiUrl}/pasos-criticos/900/indicadores?ideRtf=55`).flush(ok([
      { id: 23, pasoCriticoID: 900, postulanteIndicadorCadenaID: 1, indicador: 'Rendimiento de café pergamino', metaProgramada: 5, metaEjecutada: 2 }
    ]));

    httpMock.expectOne(`${apiUrl}/rtfs/55/evaluaciones`).flush(ok<EvaluacionUrEstadoDto>({
      pliegoObservaciones: 'texto colapsado',
      revisiones: [
        { ideRevision: 1, ideRtf: 55, txtSeccion: 'UR_META_7', estConformidad: 'OBSERVADO', txtObservacion: 'Falta evidencia fotográfica', txtCategoria: 'TECNICA_FISICA', estSubsanable: true, estAtencion: 'PENDIENTE', fecRegistro: '2026-09-16' },
        { ideRevision: 2, ideRtf: 55, txtSeccion: 'UR_INDICADOR_23', estConformidad: 'CONFORME', fecRegistro: '2026-09-16' },
        { ideRevision: 3, ideRtf: 55, txtSeccion: 'UR_R1_55', estConformidad: 'OBSERVADO', txtObservacion: 'Aclarar cambios reportados', txtCategoria: 'CUALITATIVA', estSubsanable: false, estAtencion: 'PENDIENTE', fecRegistro: '2026-09-16' }
      ]
    }));

    expect(fixture.componentInstance.isLoading()).toBe(false);
    expect(fixture.componentInstance.hasError()).toBe(false);

    const observaciones = fixture.componentInstance.observaciones();
    expect(observaciones).toHaveLength(2);
    expect(observaciones[0]).toMatchObject({ kind: 'META', titulo: 'Instalación de secadoras solares', subsanable: true, atendida: false });
    expect(observaciones[1]).toMatchObject({ kind: 'R1', titulo: 'Información cualitativa (R1)', subsanable: false, atendida: false });
  });

  it('falls back to a generic title when the meta/indicador is not found among the loaded ones', () => {
    const fixture = crearComponente(55);
    fixture.detectChanges();

    httpMock.expectOne(`${apiUrl}/rtfs/55`).flush(ok(rtfDetalle));
    httpMock.expectOne(`${apiUrl}/pasos-criticos/900/metas?ideRtf=55`).flush(ok([]));
    httpMock.expectOne(`${apiUrl}/pasos-criticos/900/indicadores?ideRtf=55`).flush(ok([]));
    httpMock.expectOne(`${apiUrl}/rtfs/55/evaluaciones`).flush(ok<EvaluacionUrEstadoDto>({
      pliegoObservaciones: '',
      revisiones: [{ ideRevision: 1, ideRtf: 55, txtSeccion: 'UR_META_999', estConformidad: 'OBSERVADO', estAtencion: 'PENDIENTE', fecRegistro: '2026-09-16' }]
    }));

    expect(fixture.componentInstance.observaciones()[0].titulo).toBe('Meta física #999');
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
    httpMock.expectOne(`${apiUrl}/rtfs/55`).flush(ok(rtfDetalle));
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

  describe('atención de observaciones (ADR-014 frontend Fase 5)', () => {
    it('separates pendientes from atendidas and flags todasAtendidas correctly', () => {
      const fixture = cargarConDosObservaciones();

      expect(fixture.componentInstance.pendientes()).toHaveLength(1);
      expect(fixture.componentInstance.pendientes()[0].ideRevision).toBe(21);
      expect(fixture.componentInstance.todasAtendidas()).toBe(false);
      const atendida = fixture.componentInstance.observaciones().find(o => o.ideRevision === 22);
      expect(atendida).toMatchObject({ atendida: true, respuestaOa: 'Ya corregido' });
    });

    it('does nothing when the response text is empty', () => {
      const fixture = cargarConDosObservaciones();

      fixture.componentInstance.atenderObservacion(21);

      httpMock.expectNone(`${apiUrl}/rtfs/55/evaluaciones/atencion`);
    });

    it('posts the response and reloads the evaluación on success', () => {
      const fixture = cargarConDosObservaciones();

      fixture.componentInstance.actualizarRespuesta(21, 'Se adjuntó la evidencia faltante');
      fixture.componentInstance.atenderObservacion(21);

      const req = httpMock.expectOne(`${apiUrl}/rtfs/55/evaluaciones/atencion`);
      expect(req.request.body).toEqual({ respuestas: [{ ideRevision: 21, txtRespuesta: 'Se adjuntó la evidencia faltante' }] });
      req.flush(ok(true));

      // recarga tras atender
      httpMock.expectOne(`${apiUrl}/rtfs/55/evaluaciones`).flush(ok<EvaluacionUrEstadoDto>({
        pliegoObservaciones: '',
        revisiones: [
          { ideRevision: 21, ideRtf: 55, txtSeccion: 'UR_META_1', estConformidad: 'OBSERVADO', txtObservacion: 'Falta evidencia', estAtencion: 'ATENDIDA', txtRespuestaOa: 'Se adjuntó la evidencia faltante', fecRegistro: '2026-09-16' },
          { ideRevision: 22, ideRtf: 55, txtSeccion: 'UR_META_2', estConformidad: 'OBSERVADO', txtObservacion: 'Corregir monto', estAtencion: 'ATENDIDA', txtRespuestaOa: 'Ya corregido', fecRegistro: '2026-09-16' }
        ]
      }));

      expect(fixture.componentInstance.atendiendoId()).toBeNull();
      expect(fixture.componentInstance.todasAtendidas()).toBe(true);
    });

    it('clears atendiendoId and leaves the observation pending on error', () => {
      const fixture = cargarConDosObservaciones();

      fixture.componentInstance.actualizarRespuesta(21, 'Respuesta');
      fixture.componentInstance.atenderObservacion(21);

      httpMock.expectOne(`${apiUrl}/rtfs/55/evaluaciones/atencion`).flush('boom', { status: 500, statusText: 'Server Error' });

      expect(fixture.componentInstance.atendiendoId()).toBeNull();
      expect(fixture.componentInstance.pendientes()).toHaveLength(1);
    });
  });
});

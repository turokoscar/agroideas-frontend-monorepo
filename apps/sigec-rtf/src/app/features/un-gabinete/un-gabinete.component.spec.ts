import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NEVER } from 'rxjs';
import { UnGabineteComponent } from './un-gabinete.component';
import { RtfService } from '../../core/services/rtf.service';
import { environment } from '../../../environments/environment';
import { ApiResponse, EvaluacionUrEstadoDto, RtfCabeceraDto, UrCompletoDto } from '../../core/models';

/**
 * Cubre solo lo nuevo de ADR-016 Fase 6 (respuesta de la OA, de solo lectura, al reabrir el
 * gabinete). El resto del componente no tenía specs antes de este cambio.
 */
describe('UnGabineteComponent — respuesta de la OA (ADR-016 Fase 6)', () => {
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl;
  const ok = <T>(datos: T): ApiResponse<T> => ({ respuesta: 'OK', mensaje: 'OK', datos });

  const cabecera: RtfCabeceraDto = {
    ideRtf: 77, ideConvenio: 1, numPasoCritico: 1, idePasoCritico: null as unknown as number,
    fecInicioPeriodo: '2026-01-01', fecFinPeriodo: '2026-06-01', estRtf: 'EN_REVISION',
    fecHabilitacion: '2026-01-01', fecLimite: '2026-06-11'
  };

  function crearComponente() {
    TestBed.configureTestingModule({
      imports: [UnGabineteComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    httpMock = TestBed.inject(HttpTestingController);
    return TestBed.createComponent(UnGabineteComponent);
  }

  /** Abre el expediente 77 y deja el borrador cargado, con las revisiones que le pasemos. */
  function seleccionarConRevisiones(revisiones: EvaluacionUrEstadoDto['revisiones']) {
    const fixture = crearComponente();
    fixture.componentInstance.seleccionarRtf(77);

    httpMock.expectOne(`${apiUrl}/rtfs/77/completo`).flush(ok<UrCompletoDto>({
      cabecera, evidencias: [], revisiones: [], verificacionesCampo: []
    }));
    httpMock.expectOne(`${apiUrl}/rtfs/77/gastos-f1`).flush(ok([]));
    httpMock.expectOne(`${apiUrl}/un/rtfs/77/informe-comprobacion`).flush(ok(null));
    httpMock.expectOne(`${apiUrl}/rtfs/77/cartas`).flush(ok([]));
    httpMock.expectOne(`${apiUrl}/rtfs/77/estado-plazo?tipPlazo=REEVALUACION_UN`).flush(ok(null));
    httpMock.expectOne(`${apiUrl}/rtfs/77/evaluaciones`).flush(ok<EvaluacionUrEstadoDto>({
      pliegoObservaciones: '',
      revisiones
    }));

    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('shows the OA response for a META item that already has one', () => {
    const fixture = seleccionarConRevisiones([
      { ideRevision: 1, ideRtf: 77, txtSeccion: 'UR_META_9', estConformidad: 'OBSERVADO', txtObservacion: 'Falta evidencia', estAtencion: 'ATENDIDA', txtRespuestaOa: 'Se adjuntó la evidencia solicitada', fecRegistro: '2026-09-17' }
    ]);

    expect(fixture.componentInstance.respuestaOaDe('META', 9)).toBe('Se adjuntó la evidencia solicitada');
  });

  it('returns undefined for an item the OA has not answered yet', () => {
    const fixture = seleccionarConRevisiones([
      { ideRevision: 1, ideRtf: 77, txtSeccion: 'UR_META_9', estConformidad: 'OBSERVADO', txtObservacion: 'Falta evidencia', estAtencion: 'PENDIENTE', fecRegistro: '2026-09-17' }
    ]);

    expect(fixture.componentInstance.respuestaOaDe('META', 9)).toBeUndefined();
  });

  it('exposes the R1 response through respuestaOaR1', () => {
    const fixture = seleccionarConRevisiones([
      { ideRevision: 2, ideRtf: 77, txtSeccion: 'UR_R1_77', estConformidad: 'OBSERVADO', txtObservacion: 'Aclarar cambios', estAtencion: 'ATENDIDA', txtRespuestaOa: 'Se explican los cambios en el nuevo informe', fecRegistro: '2026-09-17' }
    ]);

    expect(fixture.componentInstance.respuestaOaR1()).toBe('Se explican los cambios en el nuevo informe');
  });

  it('does not leak the OA response into the payload sent back to guardarEvaluacion', () => {
    const fixture = seleccionarConRevisiones([
      { ideRevision: 1, ideRtf: 77, txtSeccion: 'UR_META_9', estConformidad: 'OBSERVADO', txtObservacion: 'Falta evidencia', estAtencion: 'ATENDIDA', txtRespuestaOa: 'Se adjuntó la evidencia solicitada', fecRegistro: '2026-09-17' }
    ]);
    const rtfService = TestBed.inject(RtfService);
    const guardarSpy = jest.spyOn(rtfService, 'guardarEvaluacionUr').mockReturnValue(NEVER);

    fixture.componentInstance.guardarEvaluacion();

    const [, items] = guardarSpy.mock.calls[0];
    expect(items.some((i: any) => 'txtRespuestaOa' in i)).toBe(false);
  });
});

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

/** ADR-017 (frontend): separación de la bandeja en pestañas "Evaluación" / "Plazos y Cobranza". */
describe('UnGabineteComponent — pestañas de la bandeja (ADR-017)', () => {
  function crearComponente() {
    TestBed.configureTestingModule({
      imports: [UnGabineteComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    return TestBed.createComponent(UnGabineteComponent);
  }

  function rtf(ideRtf: number, estRtf: string, fecLimite = '2026-01-01'): RtfCabeceraDto {
    return {
      ideRtf, ideConvenio: 1, numPasoCritico: 1, idePasoCritico: null as unknown as number,
      fecInicioPeriodo: '2026-01-01', fecFinPeriodo: '2026-06-01', estRtf,
      fecHabilitacion: '2026-01-01', fecLimite,
    };
  }

  it('defaults to the "evaluacion" tab', () => {
    const fixture = crearComponente();
    expect(fixture.componentInstance.activeTab()).toBe('evaluacion');
  });

  it('only shows evaluation-track states in the "evaluacion" tab', () => {
    const fixture = crearComponente();
    const rtfService = TestBed.inject(RtfService);
    rtfService.unRtfList.set([
      rtf(1, 'EN_REVISION'), rtf(2, 'IN_REVISION_UN'), rtf(3, 'VENCIDO'), rtf(4, 'BLOQUEO_DEFINITIVO'),
    ]);

    const ids = fixture.componentInstance.bandejaFiltrada().map(r => r.ideRtf);
    expect(ids.sort()).toEqual([1, 2]);
  });

  it('only shows deadline-escalation states in the "plazos" tab', () => {
    const fixture = crearComponente();
    const rtfService = TestBed.inject(RtfService);
    rtfService.unRtfList.set([
      rtf(1, 'EN_REVISION'), rtf(2, 'VENCIDO'), rtf(3, 'EN_DESACATO'), rtf(4, 'BLOQUEO_DEFINITIVO'),
    ]);

    fixture.componentInstance.cambiarTab('plazos');

    const ids = fixture.componentInstance.bandejaFiltrada().map(r => r.ideRtf);
    expect(ids.sort()).toEqual([2, 3, 4]);
  });

  it('sorts the "plazos" tab by escalation severity, most critical first', () => {
    const fixture = crearComponente();
    const rtfService = TestBed.inject(RtfService);
    rtfService.unRtfList.set([
      rtf(1, 'VENCIDO'), rtf(2, 'BLOQUEO_DEFINITIVO'), rtf(3, 'EN_DESACATO'), rtf(4, 'PLAZO_LIMITE_NOTARIAL'),
    ]);

    fixture.componentInstance.cambiarTab('plazos');

    const ids = fixture.componentInstance.bandejaFiltrada().map(r => r.ideRtf);
    expect(ids).toEqual([2, 4, 3, 1]);
  });

  it('does not reorder the "evaluacion" tab (keeps arrival order)', () => {
    const fixture = crearComponente();
    const rtfService = TestBed.inject(RtfService);
    rtfService.unRtfList.set([rtf(5, 'IN_REVISION_UN'), rtf(1, 'EN_REVISION')]);

    const ids = fixture.componentInstance.bandejaFiltrada().map(r => r.ideRtf);
    expect(ids).toEqual([5, 1]);
  });

  it('counts each tab independently, regardless of which tab is active', () => {
    const fixture = crearComponente();
    const rtfService = TestBed.inject(RtfService);
    rtfService.unRtfList.set([
      rtf(1, 'EN_REVISION'), rtf(2, 'AUDITADO_CAMPO'), rtf(3, 'VENCIDO'),
    ]);

    expect(fixture.componentInstance.conteoEvaluacion()).toBe(2);
    expect(fixture.componentInstance.conteoPlazos()).toBe(1);
  });

  it('resets filtroEstado when switching tabs, to avoid a filter that does not match the new dropdown', () => {
    const fixture = crearComponente();
    fixture.componentInstance.filtroEstado.set('EN_REVISION');

    fixture.componentInstance.cambiarTab('plazos');

    expect(fixture.componentInstance.filtroEstado()).toBe('');
  });

  it('exposes only the active tab\'s states for the "Estado" dropdown', () => {
    const fixture = crearComponente();
    expect(fixture.componentInstance.estadosPestanaActiva()).toEqual(['EN_REVISION', 'AUDITADO_CAMPO', 'IN_REVISION_UN']);

    fixture.componentInstance.cambiarTab('plazos');
    expect(fixture.componentInstance.estadosPestanaActiva()).toEqual([
      'VENCIDO', 'PLAZO_INICIAL_NOTIFICACION', 'EN_DESACATO', 'PLAZO_LIMITE_NOTARIAL', 'BLOQUEO_DEFINITIVO',
    ]);
  });

  it('estadosBandeja (used by loadBandejaUn) still covers the union of both tabs', () => {
    const fixture = crearComponente();
    const todos = fixture.componentInstance.estadosBandeja;
    expect(todos).toEqual([
      'EN_REVISION', 'AUDITADO_CAMPO', 'IN_REVISION_UN',
      'VENCIDO', 'PLAZO_INICIAL_NOTIFICACION', 'EN_DESACATO', 'PLAZO_LIMITE_NOTARIAL', 'BLOQUEO_DEFINITIVO',
    ]);
  });

  describe('diasRestantes', () => {
    it('returns "—" when there is no fecLimite', () => {
      const fixture = crearComponente();
      expect(fixture.componentInstance.diasRestantes(undefined).texto).toBe('—');
    });

    it('flags an overdue date as urgent', () => {
      const fixture = crearComponente();
      const ayer = new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10);
      const resultado = fixture.componentInstance.diasRestantes(ayer);
      expect(resultado.urgente).toBe(true);
      expect(resultado.texto).toContain('Vencido hace');
    });

    it('does not flag a far-future date as urgent', () => {
      const fixture = crearComponente();
      const lejos = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
      const resultado = fixture.componentInstance.diasRestantes(lejos);
      expect(resultado.urgente).toBe(false);
      expect(resultado.texto).toContain('Vence en');
    });
  });
});

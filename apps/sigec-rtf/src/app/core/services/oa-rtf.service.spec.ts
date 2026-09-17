import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { OaRtfService } from './oa-rtf.service';
import { environment } from '../../../environments/environment';
import { ApiResponse, RtfCabeceraDto } from '../models';

describe('OaRtfService', () => {
  let service: OaRtfService;
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl;

  const ok = <T>(datos: T): ApiResponse<T> => ({ respuesta: 'OK', mensaje: 'OK', datos });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(OaRtfService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('resolvePostulanteId', () => {
    it('sets postulanteId on success', () => {
      let resultado: number | undefined;
      service.resolvePostulanteId().subscribe(id => (resultado = id));

      httpMock.expectOne(`${apiUrl}/postulantes/actual`).flush(ok({ postulanteId: 2242 }));

      expect(resultado).toBe(2242);
      expect(service.postulanteId()).toBe(2242);
    });

    it('propagates the error instead of swallowing it', () => {
      let error: unknown;
      service.resolvePostulanteId().subscribe({ error: (e) => (error = e) });

      httpMock.expectOne(`${apiUrl}/postulantes/actual`).flush('boom', { status: 500, statusText: 'Server Error' });

      expect(error).toBeTruthy();
      expect(service.postulanteId()).toBeNull();
    });
  });

  describe('cargarPasosCriticosDelUsuario', () => {
    it('resolves the postulanteId first when none is cached yet', () => {
      service.cargarPasosCriticosDelUsuario().subscribe();

      httpMock.expectOne(`${apiUrl}/postulantes/actual`).flush(ok({ postulanteId: 2242 }));
      httpMock.expectOne(`${apiUrl}/postulantes/2242/pasos-criticos`).flush(ok([]));

      expect(service.postulanteId()).toBe(2242);
    });

    it('reuses the cached postulanteId without calling /postulantes/actual again', () => {
      service.postulanteId.set(2242);

      service.cargarPasosCriticosDelUsuario().subscribe();

      httpMock.expectOne(`${apiUrl}/postulantes/2242/pasos-criticos`).flush(ok([]));
      httpMock.expectNone(`${apiUrl}/postulantes/actual`);
    });
  });

  describe('loadDashboard', () => {
    it('populates the dashboard signals, mapping pasos and disbursements', () => {
      service.loadDashboard(2242).subscribe();

      httpMock.expectOne(`${apiUrl}/postulantes/2242/dashboard`).flush(ok({
        convenioId: 'CONV-2242',
        oa: 'Asociación de Productores',
        budget: 10000,
        disbursed: 4000,
        durationMonths: 12,
        currentMonth: 3,
        activeRtfStatus: 'EN_EDICION',
        activePasoNumero: 2,
        totalPasos: 5,
        physicalProgress: 40,
        pasos: [{ id: 1, label: 'Paso 1', startMonth: 1, endMonth: 2, start: '2026-01-01', end: '2026-02-01', status: 'Aprobado', rtfId: 10 }],
        disbursements: [{ id: 1 } as any]
      }));

      expect(service.convenioId()).toBe('CONV-2242');
      expect(service.oa()).toBe('Asociación de Productores');
      expect(service.budget()).toBe(10000);
      expect(service.disbursed()).toBe(4000);
      expect(service.rtfStatus()).toBe('EN_EDICION');
      expect(service.pasos()).toHaveLength(1);
      expect(service.pasos()[0].start).toBeInstanceOf(Date);
      expect(service.disbursements()).toHaveLength(1);
    });
  });

  describe('loadDetalleRtf', () => {
    it('populates rtfId, estado and the R1 text fields', () => {
      const detalle: Partial<RtfCabeceraDto> = {
        ideRtf: 10001,
        estRtf: 'EN_REVISION',
        txtActividadesRealizadas: 'Se realizaron...',
        txtLogros: 'Se cumplieron las metas.'
      };

      service.loadDetalleRtf(10001).subscribe();
      httpMock.expectOne(`${apiUrl}/rtfs/10001`).flush(ok(detalle));

      expect(service.rtfId()).toBe(10001);
      expect(service.rtfStatus()).toBe('EN_REVISION');
      expect(service.txtActividadesRealizadas()).toBe('Se realizaron...');
      expect(service.txtLogros()).toBe('Se cumplieron las metas.');
    });
  });

  describe('registrarRtf', () => {
    it('sets rtfId from the response', () => {
      service.registrarRtf({ ideConvenio: 2242 }).subscribe();
      httpMock.expectOne(`${apiUrl}/rtfs`).flush(ok({ ideRtf: 99 }));

      expect(service.rtfId()).toBe(99);
    });
  });

  describe('enviarRtf', () => {
    it('marks the RTF as ENVIADO', () => {
      service.enviarRtf(10001).subscribe();
      httpMock.expectOne(`${apiUrl}/rtfs/10001/envios`).flush(ok({}));

      expect(service.rtfStatus()).toBe('ENVIADO');
    });
  });

  describe('evidencias', () => {
    it('appends the uploaded evidencia to the list', () => {
      service.evidencias.set([{ ideEvidencia: 1 } as any]);

      service.uploadEvidencia(10001, 5, 'METAFISICA', new File(['x'], 'a.pdf')).subscribe();
      httpMock.expectOne(`${apiUrl}/rtfs/10001/evidencias`).flush(ok({ ideEvidencia: 2 }));

      expect(service.evidencias().map(e => e.ideEvidencia)).toEqual([1, 2]);
    });

    it('removes the evidencia from the list once deleted', () => {
      service.evidencias.set([{ ideEvidencia: 1 } as any, { ideEvidencia: 2 } as any]);

      service.removeEvidencia(1).subscribe();
      httpMock.expectOne(`${apiUrl}/evidencias/1`).flush(ok(true));

      expect(service.evidencias().map(e => e.ideEvidencia)).toEqual([2]);
    });
  });

  describe('local signal updates (no HTTP)', () => {
    it('updateMeta patches only the targeted index', () => {
      service.metas.set([{ ideMetaFisica: 1, canEjecutada: 0 } as any, { ideMetaFisica: 2, canEjecutada: 0 } as any]);

      service.updateMeta(1, { canEjecutada: 5 } as any);

      expect(service.metas()[0].canEjecutada).toBe(0);
      expect(service.metas()[1].canEjecutada).toBe(5);
    });

    it('updateIndicador patches only the targeted index', () => {
      service.indicadores.set([{ ideIndicadorAvance: 1, canEjecutado: 0 } as any]);

      service.updateIndicador(0, { canEjecutado: 3 } as any);

      expect(service.indicadores()[0].canEjecutado).toBe(3);
    });
  });

  describe('loadBandejaOA', () => {
    it('populates the bandeja list, total and estado for a single estado', () => {
      service.loadBandejaOA(['EN_EDICION'], 5).subscribe();

      httpMock.expectOne(`${apiUrl}/rtfs?estados=EN_EDICION&cantidad=5`).flush(ok({
        total: 12,
        items: [{ ideRtf: 1 } as any]
      }));

      expect(service.oaBandejaList()).toHaveLength(1);
      expect(service.oaBandejaTotal()).toBe(12);
      expect(service.oaBandejaEstado()).toBe('EN_EDICION');
    });

    it('consolidates several estados into one CSV request', () => {
      service.loadBandejaOA(['EN_REVISION', 'AUDITADO_CAMPO', 'IN_REVISION_UN']).subscribe();

      httpMock.expectOne(`${apiUrl}/rtfs?estados=EN_REVISION,AUDITADO_CAMPO,IN_REVISION_UN&cantidad=200`).flush(ok({
        total: 0,
        items: []
      }));

      expect(service.oaBandejaEstado()).toBe('EN_REVISION,AUDITADO_CAMPO,IN_REVISION_UN');
    });
  });

  describe('loadEstadoPlazo', () => {
    it('sets rtfDeadlineHours and rtfDeadlineTipo from the response', () => {
      service.loadEstadoPlazo(1).subscribe();

      httpMock.expectOne(`${apiUrl}/rtfs/1/estado-plazo`).flush(ok({
        ideRtf: 1,
        tipPlazo: 'SUBSANACION_OBSERVACION',
        fecHabilitacion: '2026-01-01',
        fecLimite: '2026-01-11',
        estPlazo: 'ACTIVO',
        horasRestantes: 72
      }));

      expect(service.rtfDeadlineHours()).toBe(72);
      expect(service.rtfDeadlineTipo()).toBe('SUBSANACION_OBSERVACION');
    });

    /**
     * Antes se comparaba con `if (data?.horasRestantes)`, una condición "falsy" que ignoraba un
     * plazo ya vencido (horasRestantes = 0) y dejaba el valor previo del signal.
     */
    it('sets rtfDeadlineHours to 0 when the deadline already expired (falsy value, not missing)', () => {
      service.rtfDeadlineHours.set(5);
      service.loadEstadoPlazo(1).subscribe();

      httpMock.expectOne(`${apiUrl}/rtfs/1/estado-plazo`).flush(ok({
        ideRtf: 1,
        tipPlazo: 'PRESENTACION_INICIAL',
        fecHabilitacion: '2026-01-01',
        fecLimite: '2026-01-16',
        estPlazo: 'VENCIDO',
        horasRestantes: 0
      }));

      expect(service.rtfDeadlineHours()).toBe(0);
    });

    it('resets to defaults when there is no active plazo', () => {
      service.rtfDeadlineHours.set(10);
      service.rtfDeadlineTipo.set('PRESENTACION_INICIAL');
      service.loadEstadoPlazo(1).subscribe();

      httpMock.expectOne(`${apiUrl}/rtfs/1/estado-plazo`).flush(ok(null));

      expect(service.rtfDeadlineHours()).toBe(0);
      expect(service.rtfDeadlineTipo()).toBeNull();
    });
  });
});

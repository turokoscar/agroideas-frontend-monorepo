import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { OaDashboardComponent } from './oa-dashboard.component';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';
import { ApiResponse, EvaluacionUrEstadoDto } from '../../core/models';

describe('OaDashboardComponent', () => {
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl;
  const ok = <T>(datos: T): ApiResponse<T> => ({ respuesta: 'OK', mensaje: 'OK', datos });

  function crearComponente(userId: string | null) {
    TestBed.configureTestingModule({
      imports: [OaDashboardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: { user: signal(userId ? { id: userId } : null) } }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(OaDashboardComponent);
    return fixture;
  }

  afterEach(() => httpMock.verify());

  describe('reload (ngOnInit)', () => {
    it('flags hasError immediately when there is no authenticated user id', () => {
      const fixture = crearComponente(null);
      fixture.detectChanges();

      expect(fixture.componentInstance.hasError()).toBe(true);
      expect(fixture.componentInstance.isLoading()).toBe(false);
    });

    it('loads the dashboard and actividad reciente when postulanteId resolves', () => {
      const fixture = crearComponente('1');
      fixture.detectChanges();

      httpMock.expectOne(`${apiUrl}/postulantes/actual`).flush(ok({ postulanteId: 2242 }));
      httpMock.expectOne(`${apiUrl}/postulantes/2242/dashboard`).flush(ok({
        convenioId: 'CONV-2242', oa: 'OA', budget: 100, disbursed: 10, durationMonths: 12,
        currentMonth: 1, activeRtfStatus: 'EN_EDICION', activePasoNumero: 1, totalPasos: 3, physicalProgress: 0
      }));
      httpMock.expectOne(`${apiUrl}/rtfs/actividad-reciente`).flush(ok([]));

      expect(fixture.componentInstance.isLoading()).toBe(false);
      expect(fixture.componentInstance.hasError()).toBe(false);
    });

    it('flags hasError when resolving the postulanteId fails, without leaving isLoading stuck', () => {
      const fixture = crearComponente('1');
      fixture.detectChanges();

      httpMock.expectOne(`${apiUrl}/postulantes/actual`).flush('boom', { status: 500, statusText: 'Server Error' });

      expect(fixture.componentInstance.isLoading()).toBe(false);
      expect(fixture.componentInstance.hasError()).toBe(true);
    });
  });

  describe('statusLabel', () => {
    it.each([
      ['PENDIENTE', 'En Edición'],
      ['ENVIADO', 'Enviado a UR'],
      ['EN_REVISION', 'En Revisión'],
      ['APROBADO', 'Aprobado'],
      ['RECHAZADO', 'Rechazado'],
      ['VENCIDO', 'Vencido'],
      ['OBSERVADO', 'Con Observaciones'],
      ['ALGO_RARO', 'ALGO_RARO']
    ])('maps %s to "%s"', (estado, esperado) => {
      const fixture = crearComponente('1');
      fixture.componentInstance.rtfService.rtfStatus.set(estado);

      expect(fixture.componentInstance.statusLabel()).toBe(esperado);
    });
  });

  describe('activePasoCriticoId', () => {
    it('prefers the paso marked as Activo over the first one', () => {
      const fixture = crearComponente('1');
      fixture.componentInstance.rtfService.pasos.set([
        { id: 1, status: 'Aprobado' } as any,
        { id: 2, status: 'Activo' } as any
      ]);

      expect(fixture.componentInstance.activePasoCriticoId()).toBe(2);
    });

    it('falls back to the first paso when none is Activo', () => {
      const fixture = crearComponente('1');
      fixture.componentInstance.rtfService.pasos.set([{ id: 5, status: 'Aprobado' } as any]);

      expect(fixture.componentInstance.activePasoCriticoId()).toBe(5);
    });
  });

  describe('observacionesPendientes (ADR-014 frontend Fase 4)', () => {
    const ok = <T>(datos: T): ApiResponse<T> => ({ respuesta: 'OK', mensaje: 'OK', datos });

    it('queries the evaluación and counts OBSERVADO rows when the active paso is OBSERVADO', () => {
      const fixture = crearComponente('1');
      fixture.detectChanges();

      httpMock.expectOne(`${apiUrl}/postulantes/actual`).flush(ok({ postulanteId: 2242 }));
      httpMock.expectOne(`${apiUrl}/postulantes/2242/dashboard`).flush(ok({
        convenioId: 'CONV-2242', oa: 'OA', budget: 100, disbursed: 10, durationMonths: 12,
        currentMonth: 1, activeRtfStatus: 'OBSERVADO', activePasoNumero: 1, totalPasos: 3, physicalProgress: 0,
        pasos: [{ id: 1, label: 'Paso 1', startMonth: 1, endMonth: 6, start: '2026-01-01', end: '2026-06-01', status: 'Activo', rtfId: 77 }]
      }));
      httpMock.expectOne(`${apiUrl}/rtfs/actividad-reciente`).flush(ok([]));

      httpMock.expectOne(`${apiUrl}/rtfs/77/evaluaciones`).flush(ok<EvaluacionUrEstadoDto>({
        pliegoObservaciones: '',
        revisiones: [
          { ideRevision: 1, ideRtf: 77, txtSeccion: 'UR_META_1', estConformidad: 'OBSERVADO', fecRegistro: '2026-09-16' },
          { ideRevision: 2, ideRtf: 77, txtSeccion: 'UR_META_2', estConformidad: 'CONFORME', fecRegistro: '2026-09-16' }
        ]
      }));

      expect(fixture.componentInstance.observacionesPendientes()).toBe(1);
    });

    it('does not query the evaluación when the active paso is not OBSERVADO', () => {
      const fixture = crearComponente('1');
      fixture.detectChanges();

      httpMock.expectOne(`${apiUrl}/postulantes/actual`).flush(ok({ postulanteId: 2242 }));
      httpMock.expectOne(`${apiUrl}/postulantes/2242/dashboard`).flush(ok({
        convenioId: 'CONV-2242', oa: 'OA', budget: 100, disbursed: 10, durationMonths: 12,
        currentMonth: 1, activeRtfStatus: 'EN_EDICION', activePasoNumero: 1, totalPasos: 3, physicalProgress: 0,
        pasos: [{ id: 1, label: 'Paso 1', startMonth: 1, endMonth: 6, start: '2026-01-01', end: '2026-06-01', status: 'Activo', rtfId: 77 }]
      }));
      httpMock.expectOne(`${apiUrl}/rtfs/actividad-reciente`).flush(ok([]));

      httpMock.expectNone(`${apiUrl}/rtfs/77/evaluaciones`);
      expect(fixture.componentInstance.observacionesPendientes()).toBe(0);
    });
  });

  describe('irAObservaciones', () => {
    it('sets rtfId to the active paso\'s rtfId before navigating', () => {
      const fixture = crearComponente('1');
      fixture.componentInstance.rtfService.pasos.set([{ id: 1, status: 'Activo', rtfId: 77 } as any]);

      const router = TestBed.inject(Router);
      const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);

      fixture.componentInstance.irAObservaciones();

      expect(fixture.componentInstance.rtfService.rtfId()).toBe(77);
      expect(navigateSpy).toHaveBeenCalledWith(['/rtf/pasos-criticos/observaciones']);
    });

    it('still navigates even when the active rtfId is unknown', () => {
      const fixture = crearComponente('1');
      fixture.componentInstance.rtfService.pasos.set([]);

      const router = TestBed.inject(Router);
      const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);

      fixture.componentInstance.irAObservaciones();

      expect(navigateSpy).toHaveBeenCalledWith(['/rtf/pasos-criticos/observaciones']);
    });
  });

  describe('helpers visuales', () => {
    it('financialProgress is 0 when there is no budget to avoid dividing by zero', () => {
      const fixture = crearComponente('1');

      expect(fixture.componentInstance.financialProgress).toBe(0);
    });

    it('financialProgress rounds disbursed/budget to a percentage', () => {
      const fixture = crearComponente('1');
      fixture.componentInstance.rtfService.budget.set(200);
      fixture.componentInstance.rtfService.disbursed.set(50);

      expect(fixture.componentInstance.financialProgress).toBe(25);
    });

    it('pasoClass y pasoBadgeClass distinguen Aprobado/Activo/otro', () => {
      const fixture = crearComponente('1');
      const c = fixture.componentInstance;

      expect(c.pasoClass('Aprobado')).toContain('bg-success');
      expect(c.pasoClass('Activo')).toContain('bg-primary');
      expect(c.pasoClass('Pendiente')).toContain('bg-surface-container');
      expect(c.pasoBadgeClass('Validado')).toContain('text-success');
    });
  });
});

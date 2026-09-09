import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { OaDashboardComponent } from './oa-dashboard.component';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../core/models';

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

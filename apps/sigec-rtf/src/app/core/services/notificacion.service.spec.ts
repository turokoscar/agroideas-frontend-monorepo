import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NotificacionService } from './notificacion.service';
import { environment } from '../../../environments/environment';
import { ApiResponse, NotificacionDto } from '../models';

describe('NotificacionService', () => {
  let service: NotificacionService;
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl;

  const ok = <T>(datos: T): ApiResponse<T> => ({ respuesta: 'OK', mensaje: 'OK', datos });

  const buildNotificacion = (overrides: Partial<NotificacionDto> = {}): NotificacionDto => ({
    ideNotificacion: 1,
    ideRtf: 10001,
    ideConvenio: 2242,
    tipDestinatario: 'OA',
    txtTitulo: 'RTF aprobado',
    txtMensaje: 'El RTF fue aprobado.',
    estLeida: false,
    fecRegistro: '2026-09-09T00:00:00',
    ...overrides
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(NotificacionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    service.detenerPolling();
    httpMock.verify();
  });

  it('starts empty', () => {
    expect(service.notificaciones()).toEqual([]);
    expect(service.noLeidas()).toBe(0);
  });

  describe('cargarNotificaciones', () => {
    it('populates the signal on success', () => {
      service.cargarNotificaciones().subscribe();
      httpMock.expectOne(`${apiUrl}/notificaciones?limite=30`).flush(ok([buildNotificacion()]));

      expect(service.notificaciones()).toHaveLength(1);
    });

    it('resolves to an empty list instead of throwing when the request fails', () => {
      let resultado: NotificacionDto[] | undefined;
      service.cargarNotificaciones().subscribe(items => (resultado = items));

      httpMock.expectOne(`${apiUrl}/notificaciones?limite=30`).flush('boom', { status: 500, statusText: 'Server Error' });

      expect(resultado).toEqual([]);
      expect(service.notificaciones()).toEqual([]);
    });
  });

  describe('cargarNoLeidas', () => {
    it('populates the unread counter', () => {
      service.cargarNoLeidas().subscribe();
      httpMock.expectOne(`${apiUrl}/notificaciones/no-leidas`).flush(ok({ total: 4 }));

      expect(service.noLeidas()).toBe(4);
    });
  });

  describe('marcarLeida', () => {
    it('marks the item as read and decrements the unread counter', () => {
      service.notificaciones.set([buildNotificacion({ ideNotificacion: 1 }), buildNotificacion({ ideNotificacion: 2 })]);
      service.noLeidas.set(2);

      service.marcarLeida(1).subscribe();
      httpMock.expectOne(`${apiUrl}/notificaciones/1/leida`).flush(ok(true));

      expect(service.notificaciones().find(n => n.ideNotificacion === 1)?.estLeida).toBe(true);
      expect(service.notificaciones().find(n => n.ideNotificacion === 2)?.estLeida).toBe(false);
      expect(service.noLeidas()).toBe(1);
    });

    it('never drops the unread counter below zero', () => {
      service.noLeidas.set(0);

      service.marcarLeida(1).subscribe();
      httpMock.expectOne(`${apiUrl}/notificaciones/1/leida`).flush(ok(true));

      expect(service.noLeidas()).toBe(0);
    });
  });

  describe('iniciarPolling', () => {
    it('fetches the unread count immediately and again after the interval elapses', fakeAsync(() => {
      service.iniciarPolling(60000);

      httpMock.expectOne(`${apiUrl}/notificaciones/no-leidas`).flush(ok({ total: 1 }));
      expect(service.noLeidas()).toBe(1);

      tick(60000);
      httpMock.expectOne(`${apiUrl}/notificaciones/no-leidas`).flush(ok({ total: 2 }));
      expect(service.noLeidas()).toBe(2);

      service.detenerPolling();
    }));

    it('stops polling once detenerPolling is called', fakeAsync(() => {
      service.iniciarPolling(60000);
      httpMock.expectOne(`${apiUrl}/notificaciones/no-leidas`).flush(ok({ total: 1 }));

      service.detenerPolling();
      tick(60000);

      httpMock.expectNone(`${apiUrl}/notificaciones/no-leidas`);
    }));
  });
});

import { TestBed, fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NotificacionService } from './notificacion.service';
import { NotificacionDto } from '../models/notificacion.model';
import { environment } from '../../../environments/environment';

const URL_NOTIFICACIONES = `${environment.apiUrl}/notificaciones`;

function notificacion(ideNotificacion: number, flgLeida = false): NotificacionDto {
  return {
    ideNotificacion,
    ideCierreConvenio: 1,
    ideConvenio: 43829,
    tipDestinatario: 'UN',
    txtEvento: 'ACTA_REGISTRADA',
    txtTitulo: 'Acta registrada',
    txtMensaje: 'Se registró el Acta de Cierre.',
    codArchivo: null,
    fecRegistro: '2026-10-20T09:00:00',
    fecEfecto: '2026-10-21T00:00:00',
    flgLeida,
    fecLectura: null
  };
}

describe('NotificacionService', () => {
  let service: NotificacionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(NotificacionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    service.detenerPolling();
    http.verify();
  });

  it('cuenta las no leídas con el total de una página de 1', () => {
    service.contarNoLeidas().subscribe();
    const req = http.expectOne(r => r.url === URL_NOTIFICACIONES);
    expect(req.request.params.get('soloNoLeidas')).toBe('true');
    expect(req.request.params.get('cantidad')).toBe('1');
    req.flush({ respuesta: 'OK', mensaje: '', datos: { total: 4, items: [notificacion(1)] } });
    expect(service.noLeidas()).toBe(4);
  });

  it('lista la bandeja', () => {
    service.listar().subscribe();
    http
      .expectOne(r => r.url === URL_NOTIFICACIONES && !r.params.has('soloNoLeidas'))
      .flush({ respuesta: 'OK', mensaje: '', datos: { total: 2, items: [notificacion(1), notificacion(2, true)] } });
    expect(service.notificaciones().map(n => n.ideNotificacion)).toEqual([1, 2]);
  });

  it('marca como leída con PUT { leida: true } y descuenta el contador', () => {
    service.notificaciones.set([notificacion(1)]);
    service.noLeidas.set(1);

    service.marcarLeida(1).subscribe();
    const req = http.expectOne(`${URL_NOTIFICACIONES}/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ leida: true });
    req.flush({ respuesta: 'OK', mensaje: '', datos: notificacion(1, true) });

    expect(service.notificaciones()[0].flgLeida).toBe(true);
    expect(service.noLeidas()).toBe(0);
  });

  it('el polling sobrevive a un error y vuelve a consultar en el siguiente ciclo', fakeAsync(() => {
    service.iniciarPolling();
    http.expectOne(r => r.url === URL_NOTIFICACIONES).flush(null, { status: 500, statusText: 'Error' });

    tick(environment.notificaciones.intervaloRefrescoMs);
    http
      .expectOne(r => r.url === URL_NOTIFICACIONES)
      .flush({ respuesta: 'OK', mensaje: '', datos: { total: 2, items: [] } });
    expect(service.noLeidas()).toBe(2);

    service.detenerPolling();
    discardPeriodicTasks();
  }));
});

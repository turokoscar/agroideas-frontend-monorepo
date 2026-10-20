import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NEVER, of } from 'rxjs';
import { ToastService } from '@agroideas/ui';
import { CierreApiService } from '../../../core/services/cierre-api.service';
import { TrasladoUajComponent } from './traslado-uaj.component';
import { RevisionUajComponent } from './revision-uaj.component';
import { SubsanacionComponent } from './subsanacion.component';
import { SuscripcionRdeComponent, fechaLocal } from './suscripcion-rde.component';
import { CargoNotificacionComponent } from './cargo-notificacion.component';
import { ObservacionUajDto } from '../../../core/models/revision-legal.model';

const api = {
  derivar: jest.fn(), observar: jest.fn(), remitirProyectoRde: jest.fn(), listarObservaciones: jest.fn(), subsanar: jest.fn(),
  suscribirRde: jest.fn(), registrarCargoNotificacion: jest.fn(),
  // El informe de la subsanación tiene su propio spec: aquí no responde.
  obtenerAnexo22: jest.fn().mockReturnValue(NEVER), listarVersionesAnexo22: jest.fn().mockReturnValue(NEVER)
};
const toast = { success: jest.fn(), error: jest.fn(), info: jest.fn() };
const pdf = (nombre: string) => new File(['%PDF-'], nombre, { type: 'application/pdf' });

function crear<T>(tipo: Type<T>, entradas: Record<string, unknown> = {}) {
  TestBed.configureTestingModule({
    imports: [tipo],
    providers: [{ provide: CierreApiService, useValue: api }, { provide: ToastService, useValue: toast }]
  });
  const fixture = TestBed.createComponent(tipo);
  fixture.componentRef.setInput('ideCierre', 6);
  for (const [k, v] of Object.entries(entradas)) fixture.componentRef.setInput(k, v);
  fixture.detectChanges();
  return fixture;
}

beforeEach(() => jest.clearAllMocks());

describe('TrasladoUajComponent', () => {
  it('traslada a la UAJ y avisa al expediente', () => {
    api.derivar.mockReturnValue(of({}));
    const { componentInstance: c } = crear(TrasladoUajComponent);
    const cambio = jest.fn();
    c.cambio.subscribe(cambio);
    c.trasladar();
    expect(api.derivar).toHaveBeenCalledWith(6, 'UAJ');
    expect(cambio).toHaveBeenCalled();
  });
});

describe('RevisionUajComponent', () => {
  it('observa con las observaciones no vacías, recortadas', () => {
    api.observar.mockReturnValue(of({}));
    const { componentInstance: c } = crear(RevisionUajComponent);
    c.abrirObservar();
    expect(c.observacionesValidas()).toBe(false);
    c.editarObservacion(0, '  Falta el acta firmada  ');
    c.agregarObservacion();
    expect(c.observacionesValidas()).toBe(false);
    c.editarObservacion(1, 'Corregir la meta 3');
    c.observar();
    expect(api.observar).toHaveBeenCalledWith(6, ['Falta el acta firmada', 'Corregir la meta 3']);
  });

  it('remite el Informe Legal y el Proyecto de RDE juntos', () => {
    api.remitirProyectoRde.mockReturnValue(of({}));
    const { componentInstance: c } = crear(RevisionUajComponent);
    const informe = pdf('informe-legal.pdf');
    const proyecto = pdf('proyecto-rde.pdf');
    c.informeLegal.set(informe);
    c.remitir();
    expect(api.remitirProyectoRde).not.toHaveBeenCalled();
    c.proyectoRde.set(proyecto);
    c.remitir();
    expect(api.remitirProyectoRde).toHaveBeenCalledWith(6, informe, proyecto);
  });
});

describe('SubsanacionComponent', () => {
  const obs = (ideObservacion: number, numRonda: number, txtRespuesta: string | null = null): ObservacionUajDto => ({
    ideObservacion, ideCierreConvenio: 6, numRonda, numOrden: ideObservacion, txtObservacion: `Obs ${ideObservacion}`, ideUsuario: 1,
    fecRegistro: '2026-10-20T10:00:00', txtRespuesta, ideUsuarioRespuesta: null, fecRespuesta: null
  });

  it('exige responder todas las pendientes de la última ronda y el Anexo 22 firmado', () => {
    api.listarObservaciones.mockReturnValue(of([obs(1, 1, 'Corregido'), obs(2, 2), obs(3, 2)]));
    api.subsanar.mockReturnValue(of({}));
    const fixture = crear(SubsanacionComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;

    expect(c.ronda()).toBe(2);
    expect(c.pendientes().map(o => o.ideObservacion)).toEqual([2, 3]);
    c.responder(2, 'Se corrigió la meta');
    c.responder(3, 'Se adjuntó el acta');
    expect(c.puedeSubsanar()).toBe(false);
    c.informeFirmado.set(true);
    expect(c.puedeSubsanar()).toBe(true);

    c.subsanar();
    expect(api.subsanar).toHaveBeenCalledWith(6, [
      { ideObservacion: 2, txtRespuesta: 'Se corrigió la meta' },
      { ideObservacion: 3, txtRespuesta: 'Se adjuntó el acta' }
    ]);
  });
});

describe('SuscripcionRdeComponent', () => {
  it('valida número, fecha (ni futura ni anterior a la remisión) y PDF antes de cerrar', () => {
    api.suscribirRde.mockReturnValue(of({}));
    const { componentInstance: c } = crear(SuscripcionRdeComponent, { fecRemisionProyecto: '2026-10-10T09:00:00' });
    const rde = pdf('rde.pdf');
    c.numero.set('045-2026-MIDAGRI-PCC/DE');
    c.rde.set(rde);
    c.fecha.set('2026-10-05');
    expect(c.errorFecha()).toContain('anterior a la remisión');
    c.fecha.set('2999-01-01');
    expect(c.errorFecha()).toContain('posterior a hoy');
    c.fecha.set(fechaLocal());
    expect(c.valido()).toBe(true);

    c.suscribir();
    expect(api.suscribirRde).toHaveBeenCalledWith(6, '045-2026-MIDAGRI-PCC/DE', fechaLocal(), rde);
  });

  it('fechaLocal usa el día local, no el de UTC', () => {
    expect(fechaLocal(new Date(2026, 9, 20, 23, 30))).toBe('2026-10-20');
  });
});

describe('CargoNotificacionComponent', () => {
  it('registra el cargo y limpia la selección', () => {
    api.registrarCargoNotificacion.mockReturnValue(of({}));
    const { componentInstance: c } = crear(CargoNotificacionComponent);
    const cargo = pdf('cargo.pdf');
    c.cargo.set(cargo);
    c.registrar();
    expect(api.registrarCargoNotificacion).toHaveBeenCalledWith(6, cargo);
    expect(c.cargo()).toBeNull();
  });
});

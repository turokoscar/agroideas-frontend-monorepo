import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { BandejaOAComponent } from './bandeja-oa.component';
import { environment } from '../../../environments/environment';
import { ApiResponse, DatosPaginados, RtfCabeceraDto } from '../../core/models';

describe('BandejaOAComponent', () => {
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl;
  const ok = <T>(datos: T): ApiResponse<T> => ({ respuesta: 'OK', mensaje: 'OK', datos });

  function crearComponente() {
    TestBed.configureTestingModule({
      imports: [BandejaOAComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(BandejaOAComponent);
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('loads the PENDIENTE tab on init with a single estado', () => {
    const fixture = crearComponente();
    fixture.detectChanges();

    const req = httpMock.expectOne(`${apiUrl}/rtfs?estados=PENDIENTE&cantidad=200`);
    req.flush(ok<DatosPaginados<RtfCabeceraDto>>({ total: 1, items: [{ ideRtf: 1 } as any] }));

    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.componentInstance.rtfService.oaBandejaList()).toHaveLength(1);
  });

  it('consolidates EN_REVISION/AUDITADO_CAMPO/IN_REVISION_UN into one request for that tab', () => {
    const fixture = crearComponente();
    fixture.detectChanges();
    httpMock.expectOne(`${apiUrl}/rtfs?estados=PENDIENTE&cantidad=200`).flush(ok<DatosPaginados<RtfCabeceraDto>>({ total: 0, items: [] }));

    fixture.componentInstance.cambiarTab('EN_REVISION');

    httpMock.expectOne(`${apiUrl}/rtfs?estados=EN_REVISION,AUDITADO_CAMPO,IN_REVISION_UN&cantidad=200`)
      .flush(ok<DatosPaginados<RtfCabeceraDto>>({ total: 0, items: [] }));

    expect(fixture.componentInstance.activeTabKey()).toBe('EN_REVISION');
  });

  it('shows an error toast and stops loading when the bandeja request fails', () => {
    const fixture = crearComponente();
    fixture.detectChanges();

    httpMock.expectOne(`${apiUrl}/rtfs?estados=PENDIENTE&cantidad=200`).flush(
      { respuesta: 'ERROR', mensaje: 'boom', datos: null },
      { status: 500, statusText: 'Server Error' }
    );

    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('filters the loaded list client-side by ID RTF or paso crítico', () => {
    const fixture = crearComponente();
    fixture.detectChanges();
    httpMock.expectOne(`${apiUrl}/rtfs?estados=PENDIENTE&cantidad=200`).flush(ok<DatosPaginados<RtfCabeceraDto>>({
      total: 2,
      items: [
        { ideRtf: 101, numPasoCritico: 1 } as any,
        { ideRtf: 202, numPasoCritico: 2 } as any
      ]
    }));

    fixture.componentInstance.filtroTexto.set('101');

    expect(fixture.componentInstance.listaFiltrada()).toHaveLength(1);
    expect(fixture.componentInstance.listaFiltrada()[0].ideRtf).toBe(101);
  });

  it('navigates to the pliego de observaciones and sets rtfId when atendiendo observaciones', () => {
    const fixture = crearComponente();
    fixture.detectChanges();
    httpMock.expectOne(`${apiUrl}/rtfs?estados=PENDIENTE&cantidad=200`).flush(ok<DatosPaginados<RtfCabeceraDto>>({ total: 0, items: [] }));

    const router = TestBed.inject(Router);
    const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.componentInstance.atenderObservaciones({ ideRtf: 55, estRtf: 'OBSERVADO' } as any);

    expect(fixture.componentInstance.rtfService.rtfId()).toBe(55);
    expect(navigateSpy).toHaveBeenCalledWith(['/rtf/pasos-criticos/observaciones']);
  });

  describe('estadoPillStatus', () => {
    it('maps OBSERVADO to the "Alta" bucket so it stands out from a plain pending state', () => {
      const fixture = crearComponente();
      expect(fixture.componentInstance.estadoPillStatus('OBSERVADO')).toBe('Alta');
    });

    it('maps VENCIDO and RECHAZADO to the destructive bucket', () => {
      const fixture = crearComponente();
      expect(fixture.componentInstance.estadoPillStatus('VENCIDO')).toBe('Rechazado');
      expect(fixture.componentInstance.estadoPillStatus('RECHAZADO')).toBe('Rechazado');
    });
  });

  describe('diasRestantes', () => {
    it('flags an overdue fecLimite as urgente', () => {
      const fixture = crearComponente();
      const ayer = new Date();
      ayer.setDate(ayer.getDate() - 1);
      const resultado = fixture.componentInstance.diasRestantes(ayer.toISOString());
      expect(resultado?.urgente).toBe(true);
      expect(resultado?.texto).toContain('Vencido');
    });

    it('returns a neutral placeholder when fecLimite is missing', () => {
      const fixture = crearComponente();
      expect(fixture.componentInstance.diasRestantes(undefined)).toEqual({ texto: '—', urgente: false });
    });

    it('hides the plazo once the evaluation concluded (APROBADO/RECHAZADO)', () => {
      const fixture = crearComponente();
      const manana = new Date();
      manana.setDate(manana.getDate() + 3);
      expect(fixture.componentInstance.diasRestantes(manana.toISOString(), 'APROBADO')).toBeNull();
      expect(fixture.componentInstance.diasRestantes(manana.toISOString(), 'RECHAZADO')).toBeNull();
      expect(fixture.componentInstance.diasRestantes(manana.toISOString(), 'PENDIENTE')).not.toBeNull();
    });
  });
});

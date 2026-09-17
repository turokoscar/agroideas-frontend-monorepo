import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { OaRegistroComponent } from './oa-registro.component';
import { RtfService } from '../../core/services/rtf.service';
import { environment } from '../../../environments/environment';
import { ApiResponse, GastoF1Dto, RelacionGastosF1Dto } from '../../core/models';

/**
 * Cubre solo lo nuevo de ADR-017 (Relación de Gastos F1 con desglose OA/AGROIDEAS por ítem) --
 * el resto de este componente no tenía specs antes de este cambio.
 */
describe('OaRegistroComponent — Relación de Gastos F1 (ADR-017)', () => {
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl;
  const ok = <T>(datos: T): ApiResponse<T> => ({ respuesta: 'OK', mensaje: 'OK', datos });

  const relacionVacia: RelacionGastosF1Dto = {
    items: [], gastosSinClasificar: [],
    totalAprobadoOa: 0, totalAprobadoAgroideas: 0, totalAprobado: 0, totalFacturado: 0, totalDiferencial: 0
  };

  function crearComponente() {
    TestBed.configureTestingModule({
      imports: [OaRegistroComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } }
      ]
    });
    httpMock = TestBed.inject(HttpTestingController);
    return TestBed.createComponent(OaRegistroComponent);
  }

  afterEach(() => httpMock.verify());

  describe('hayExcedenteGastosF1', () => {
    it('is false when no relación has loaded yet', () => {
      const fixture = crearComponente();

      expect(fixture.componentInstance.hayExcedenteGastosF1()).toBe(false);
    });

    it('is false when every item is within its approved budget', () => {
      const fixture = crearComponente();
      const rtfService = TestBed.inject(RtfService);
      rtfService.relacionGastosF1.set({
        ...relacionVacia,
        items: [{ marcoLogicoID: 1, cantidad: 1, montoAprobadoOa: 100, montoAprobadoAgroideas: 200, montoAprobadoTotal: 300, montoFacturado: 300, porcentajeEjecucion: 100, montoDiferencial: 0, comprobantes: [] }]
      });

      expect(fixture.componentInstance.hayExcedenteGastosF1()).toBe(false);
    });

    it('is true when at least one item overspent its approved budget', () => {
      const fixture = crearComponente();
      const rtfService = TestBed.inject(RtfService);
      rtfService.relacionGastosF1.set({
        ...relacionVacia,
        items: [
          { marcoLogicoID: 1, cantidad: 1, montoAprobadoOa: 100, montoAprobadoAgroideas: 200, montoAprobadoTotal: 300, montoFacturado: 300, porcentajeEjecucion: 100, montoDiferencial: 0, comprobantes: [] },
          { marcoLogicoID: 2, cantidad: 1, montoAprobadoOa: 50, montoAprobadoAgroideas: 50, montoAprobadoTotal: 100, montoFacturado: 150, porcentajeEjecucion: 150, montoDiferencial: -50, comprobantes: [] }
        ]
      });

      expect(fixture.componentInstance.hayExcedenteGastosF1()).toBe(true);
    });
  });

  describe('sincronizarGastosF1', () => {
    it('refreshes the grouped relación after a successful sync, not just the flat snapshot', () => {
      const fixture = crearComponente();
      const rtfService = TestBed.inject(RtfService);
      rtfService.rtfId.set(10001);

      fixture.componentInstance.sincronizarGastosF1();

      httpMock.expectOne(`${apiUrl}/rtfs/10001/gastos-f1/sincronizacion`).flush(ok<GastoF1Dto[]>([]));
      expect(fixture.componentInstance.sincronizandoGastosF1()).toBe(false);

      const relacionReq = httpMock.expectOne(`${apiUrl}/rtfs/10001/gastos-f1/relacion`);
      relacionReq.flush(ok<RelacionGastosF1Dto>({ ...relacionVacia, totalFacturado: 12600 }));

      expect(rtfService.relacionGastosF1()?.totalFacturado).toBe(12600);
    });

    it('does nothing when no RTF is selected yet', () => {
      const fixture = crearComponente();
      TestBed.inject(RtfService).rtfId.set(null);

      fixture.componentInstance.sincronizarGastosF1();

      httpMock.expectNone(() => true);
    });
  });
});

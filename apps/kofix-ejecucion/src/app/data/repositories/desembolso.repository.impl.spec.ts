import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DesembolsoRepositoryImpl } from './desembolso.repository.impl';
import { environment } from '../../../environments/environment';

describe('DesembolsoRepositoryImpl', () => {
    let service: DesembolsoRepositoryImpl;
    let httpMock: HttpTestingController;
    const baseUrl = `${environment.apiEjecucion}/desembolsos`;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [DesembolsoRepositoryImpl]
        });
        service = TestBed.inject(DesembolsoRepositoryImpl);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('should only add the optional filters when provided', () => {
        service.getByPostulante(3).subscribe();
        const req1 = httpMock.expectOne((r) => r.url === `${baseUrl}/postulante/3`);
        expect(req1.request.params.has('numero')).toBe(false);
        expect(req1.request.params.has('tipoPagoId')).toBe(false);
        req1.flush({ datos: [], total: 0 });

        service.getByPostulante(3, 'SOL-1', 2, '2026-01-01', '2026-12-31').subscribe();
        httpMock
            .expectOne(
                (r) =>
                    r.url === `${baseUrl}/postulante/3` &&
                    r.params.get('numero') === 'SOL-1' &&
                    r.params.get('tipoPagoId') === '2' &&
                    r.params.get('fechaInicio') === '2026-01-01' &&
                    r.params.get('fechaFin') === '2026-12-31'
            )
            .flush({ datos: [], total: 0 });
    });

    it('should map desembolsos through DesembolsoMapper', (done) => {
        service.getByPostulante(3).subscribe((res) => {
            expect(res.items).toEqual([{ id: 1, fechaSolicitud: '2026-08-01', estadoId: 2, estadoNombre: 'Aprobado', tipoPagoNombre: 'Transferencia', montoTotalDesembolsado: 100, montoRendido: 0, numeroNoObjecion: 'NO-1', numeroSolicitud: 'S1', observacion: '' }]);
            done();
        });

        httpMock.expectOne((r) => r.url === `${baseUrl}/postulante/3`).flush({
            datos: [{ id: 1, fechaSolicitud: '2026-08-01', estadoId: 2, estadoNombre: 'Aprobado', tipoPagoNombre: 'Transferencia', montoTotalDesembolsado: 100, montoRendido: 0, numeroNoObjecion: 'NO-1', numeroSolicitud: 'S1', observacion: '' }]
        });
    });

    it('should build the registrar() request through DesembolsoMapper.toApiRequest', () => {
        service.registrar({ id: 99, numeroSolicitud: 'S1', postulanteId: 3 }).subscribe();

        const req = httpMock.expectOne(baseUrl);
        expect(req.request.body).toEqual({ numeroSolicitud: 'S1', postulanteId: 3, tipoPagoId: undefined, fechaDesembolso: undefined, observacion: undefined, items: undefined });
        expect(req.request.body.id).toBeUndefined();
        req.flush({ respuesta: 'OK' });
    });

    it('should attach mes/anio as query params for ejecutarCierreContable', () => {
        service.ejecutarCierreContable(8, 2026).subscribe();

        const req = httpMock.expectOne((r) => r.url === `${baseUrl}/cierres-contables` && r.params.get('mes') === '8' && r.params.get('anio') === '2026');
        expect(req.request.method).toBe('POST');
        req.flush({ respuesta: 'OK' });
    });
});

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ConvenioRepositoryImpl } from './convenio.repository.impl';
import { environment } from '../../../environments/environment';

describe('ConvenioRepositoryImpl', () => {
    let service: ConvenioRepositoryImpl;
    let httpMock: HttpTestingController;
    const baseUrl = `${environment.apiEjecucion}/convenios`;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [ConvenioRepositoryImpl]
        });
        service = TestBed.inject(ConvenioRepositoryImpl);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('should route getAsignados/getTodos/getVigente to their own endpoint, each with pagina/cantidad/busqueda', () => {
        service.getAsignados(1, 10, 'acme').subscribe();
        httpMock.expectOne((r) => r.url === `${baseUrl}/asignados` && r.params.get('pagina') === '1' && r.params.get('cantidad') === '10' && r.params.get('busqueda') === 'acme').flush({ datos: [], total: 0 });

        service.getTodos(1, 10, 'acme').subscribe();
        httpMock.expectOne((r) => r.url === `${baseUrl}/todos` && r.params.get('busqueda') === 'acme').flush({ datos: [], total: 0 });

        service.getVigente(1, 10, 'acme').subscribe();
        httpMock.expectOne((r) => r.url === `${baseUrl}/vigentes` && r.params.get('busqueda') === 'acme').flush({ datos: [], total: 0 });

        service.getEnEjecucion(1, 10, 'acme').subscribe();
        httpMock.expectOne((r) => r.url === `${baseUrl}/en-ejecucion` && r.params.get('busqueda') === 'acme').flush({ datos: [], total: 0 });
    });

    it('should include ubigeo/periodo/estado filters on getAsignados and getTodos when provided', () => {
        service.getAsignados(1, 10, 'acme', { departamentoCodigo: '08', provinciaCodigo: '0801', distritoCodigo: '080101', periodo: 2024, estado: 'ACTIVO' }).subscribe();
        httpMock.expectOne((r) => r.url === `${baseUrl}/asignados`
            && r.params.get('departamentoCodigo') === '08'
            && r.params.get('provinciaCodigo') === '0801'
            && r.params.get('distritoCodigo') === '080101'
            && r.params.get('periodo') === '2024'
            && r.params.get('estado') === 'ACTIVO'
        ).flush({ datos: [], total: 0 });

        service.getTodos(1, 10, 'acme', { estado: 'FINALIZADO' }).subscribe();
        httpMock.expectOne((r) => r.url === `${baseUrl}/todos` && r.params.get('estado') === 'FINALIZADO').flush({ datos: [], total: 0 });
    });

    it('should include ubigeo/periodo filters on getVigente but never send estado', () => {
        service.getVigente(1, 10, undefined, { departamentoCodigo: '08', periodo: 2024 }).subscribe();
        httpMock.expectOne((r) => r.url === `${baseUrl}/vigentes`
            && r.params.get('departamentoCodigo') === '08'
            && r.params.get('periodo') === '2024'
            && !r.params.has('estado')
        ).flush({ datos: [], total: 0 });
    });

    it('should omit filter params entirely when not provided', () => {
        service.getAsignados(1, 10).subscribe();
        const req = httpMock.expectOne((r) => r.url === `${baseUrl}/asignados`);
        expect(req.request.params.has('departamentoCodigo')).toBe(false);
        expect(req.request.params.has('provinciaCodigo')).toBe(false);
        expect(req.request.params.has('distritoCodigo')).toBe(false);
        expect(req.request.params.has('periodo')).toBe(false);
        expect(req.request.params.has('estado')).toBe(false);
        req.flush({ datos: [], total: 0 });
    });

    it('should map the list response through ConvenioMapper and default total to 0', (done) => {
        service.getVigente(1, 10).subscribe((res) => {
            expect(res.total).toBe(0);
            expect(res.datos).toEqual([]);
            done();
        });

        httpMock.expectOne((r) => r.url === `${baseUrl}/vigentes`).flush({});
    });

    it('should fall back to an empty DTO when getById returns no datos', (done) => {
        service.getById(5).subscribe((convenio) => {
            expect(convenio.numeroConvenio).toBeUndefined();
            expect(convenio.montoAprobado).toBe(0);
            done();
        });

        httpMock.expectOne(`${baseUrl}/5`).flush({});
    });

    it('should default the resumen financiero fields to 0 when missing', (done) => {
        service.getResumenFinanciero(5).subscribe((resumen) => {
            expect(resumen).toEqual({ programacionAcumulada: 0, ejecucionAcumulada: 0, saldoDisponible: 0 });
            done();
        });

        httpMock.expectOne(`${baseUrl}/5/resumen`).flush({});
    });

    it('should pass through getReporteMensual datos, appending anio as a query string', (done) => {
        service.getReporteMensual(2026).subscribe((data) => {
            expect(data).toEqual({ meses: [] });
            done();
        });

        httpMock.expectOne(`${baseUrl}/reporte-mensual?anio=2026`).flush({ datos: { meses: [] } });
    });
});

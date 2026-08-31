import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CarteraRepositoryImpl } from './cartera.repository.impl';
import { environment } from '../../../environments/environment';

describe('CarteraRepositoryImpl', () => {
    let service: CarteraRepositoryImpl;
    let httpMock: HttpTestingController;
    const baseUrl = `${environment.apiEjecucion}/carteras`;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [CarteraRepositoryImpl]
        });
        service = TestBed.inject(CarteraRepositoryImpl);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('should convert the offset/limit pair into a 1-based pagina/cantidad pair', () => {
        service.getCartera('acme', 20, 10).subscribe();

        const req = httpMock.expectOne(
            (r) => r.url === baseUrl && r.params.get('pagina') === '3' && r.params.get('cantidad') === '10' && r.params.get('busqueda') === 'acme'
        );

        req.flush({ datos: [], total: 0 });
    });

    it('should default the first page and empty search when nothing is provided', () => {
        service.getCartera().subscribe();

        httpMock.expectOne((r) => r.url === baseUrl && r.params.get('pagina') === '1' && r.params.get('busqueda') === '').flush({ datos: [], total: 0 });
    });

    it('should default items and total when the API returns no datos', (done) => {
        service.getCartera().subscribe((res) => {
            expect(res).toEqual({ items: [], total: 0 });
            done();
        });

        httpMock.expectOne((r) => r.url === baseUrl).flush({});
    });

    it('should include the ubigeo and especialista filters when provided', () => {
        service.getCartera('acme', 0, 10, { departamentoCodigo: '08', provinciaCodigo: '0801', distritoCodigo: '080101', especialistaId: 165793 }).subscribe();

        const req = httpMock.expectOne(
            (r) => r.url === baseUrl
                && r.params.get('departamentoCodigo') === '08'
                && r.params.get('provinciaCodigo') === '0801'
                && r.params.get('distritoCodigo') === '080101'
                && r.params.get('especialistaId') === '165793'
        );

        req.flush({ datos: [], total: 0 });
    });

    it('should omit the ubigeo and especialista filters when not provided', () => {
        service.getCartera('acme', 0, 10).subscribe();

        const req = httpMock.expectOne((r) => r.url === baseUrl);
        expect(req.request.params.has('departamentoCodigo')).toBe(false);
        expect(req.request.params.has('provinciaCodigo')).toBe(false);
        expect(req.request.params.has('distritoCodigo')).toBe(false);
        expect(req.request.params.has('especialistaId')).toBe(false);

        req.flush({ datos: [], total: 0 });
    });

    it('should fetch the ubigeo catalog by nivel and padre', (done) => {
        service.getUbigeos('PROVINCIA', '08').subscribe((ubigeos) => {
            expect(ubigeos).toEqual([{ codigo: '0801', nombre: 'CUSCO' }]);
            done();
        });

        const req = httpMock.expectOne(
            (r) => r.url === `${baseUrl}/ubigeos` && r.params.get('nivel') === 'PROVINCIA' && r.params.get('padre') === '08'
        );
        req.flush({ datos: [{ codigo: '0801', nombre: 'CUSCO' }] });
    });

    it('should omit padre when fetching top-level ubigeos', () => {
        service.getUbigeos('DEPARTAMENTO').subscribe();

        const req = httpMock.expectOne((r) => r.url === `${baseUrl}/ubigeos` && r.params.get('nivel') === 'DEPARTAMENTO');
        expect(req.request.params.has('padre')).toBe(false);
        req.flush({ datos: [] });
    });

    it('should fetch the especialistas list', (done) => {
        service.getEspecialistas().subscribe((especialistas) => {
            expect(especialistas).toEqual([{ id: 1, nombresCompletos: 'Ana Torres', email: 'ana@test.com', dni: '12345678', rol: 'ESPECIALISTA' }]);
            done();
        });

        httpMock.expectOne(`${baseUrl}/especialistas`).flush({
            datos: [{ id: 1, nombresCompletos: 'Ana Torres', email: 'ana@test.com', dni: '12345678', rol: 'ESPECIALISTA' }]
        });
    });

    it('should coerce nuevoEspecialistaId to a number and report success via isSuccess', (done) => {
        service.reasignar({ postulanteId: 5, nuevoEspecialistaId: '9' as unknown as number, observacion: 'Cambio de zona' }).subscribe((res) => {
            expect(res).toEqual({ exitoso: true, mensaje: 'Reasignado' });
            done();
        });

        const req = httpMock.expectOne(`${baseUrl}/5/reasignaciones`);
        expect(req.request.body).toEqual({ nuevoEspecialistaId: 9, observacion: 'Cambio de zona' });
        req.flush({ respuesta: 'OK', mensaje: 'Reasignado' });
    });
});

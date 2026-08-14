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

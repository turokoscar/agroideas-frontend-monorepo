import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ProgramacionRepositoryImpl } from './programacion.repository.impl';
import { environment } from '../../../environments/environment';

describe('ProgramacionRepositoryImpl', () => {
    let service: ProgramacionRepositoryImpl;
    let httpMock: HttpTestingController;
    const baseUrl = `${environment.apiEjecucion}/programaciones`;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [ProgramacionRepositoryImpl]
        });
        service = TestBed.inject(ProgramacionRepositoryImpl);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('should only add search/estado params when they are truthy', () => {
        service.getResumen(1, 10, '', '').subscribe();
        const req1 = httpMock.expectOne((r) => r.url === `${baseUrl}/resumen`);
        expect(req1.request.params.has('search')).toBe(false);
        expect(req1.request.params.has('estado')).toBe(false);
        req1.flush({ datos: { items: [], total: 0 } });

        service.getResumen(2, 20, 'acme', 'VIGENTE').subscribe();
        const req2 = httpMock.expectOne((r) => r.url === `${baseUrl}/resumen` && r.params.get('search') === 'acme' && r.params.get('estado') === 'VIGENTE');
        req2.flush({ datos: { items: [], total: 0 } });
    });

    it('should default getResumen to an empty list when there is no datos', (done) => {
        service.getResumen(1, 10, '', '').subscribe((res) => {
            expect(res).toEqual({ items: [], total: 0 });
            done();
        });

        httpMock.expectOne((r) => r.url === `${baseUrl}/resumen`).flush({});
    });

    it('should map items via ProgramacionMapper and default the total', (done) => {
        service.getByPostulante(5, 1, 10).subscribe((res) => {
            expect(res.items).toHaveLength(1);
            expect(res.items[0].item).toBe('Fertilizante');
            expect(res.total).toBe(0);
            done();
        });

        httpMock.expectOne((r) => r.url === `${baseUrl}/proyectos/5/items`).flush({ datos: [{ id: 1, descripcion: 'Fertilizante' }] });
    });

    it('should default getCronograma to an empty array', (done) => {
        service.getCronograma(9).subscribe((items) => {
            expect(items).toEqual([]);
            done();
        });

        httpMock.expectOne(`${baseUrl}/items/9/cronograma`).flush({});
    });

    it('should resolve delete() locally with null, without an HTTP call', (done) => {
        service.delete(1).subscribe((value) => {
            expect(value).toBeNull();
            httpMock.verify();
            done();
        });
    });
});

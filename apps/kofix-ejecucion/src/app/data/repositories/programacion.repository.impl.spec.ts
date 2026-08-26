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

    it('should fetch the estado-bloqueo of a postulante', (done) => {
        const response = { postulanteId: 5, items: [{ itemMlId: 1, programado: 1000, ejecutado: 1000, saldoDisponible: 0, bloqueado: true, tieneExcepcion: false }], totalBloqueados: 1 };

        service.getEstadoBloqueo(5).subscribe((res) => {
            expect(res).toEqual(response);
            done();
        });

        httpMock.expectOne(`${baseUrl}/proyectos/5/estado-bloqueo`).flush({ datos: response });
    });

    it('should default getEstadoBloqueo to an empty result when there is no datos', (done) => {
        service.getEstadoBloqueo(5).subscribe((res) => {
            expect(res).toEqual({ postulanteId: 5, items: [], totalBloqueados: 0 });
            done();
        });

        httpMock.expectOne(`${baseUrl}/proyectos/5/estado-bloqueo`).flush({});
    });

    it('should resolve delete() locally with null, without an HTTP call', (done) => {
        service.delete(1).subscribe((value) => {
            expect(value).toBeNull();
            httpMock.verify();
            done();
        });
    });
});

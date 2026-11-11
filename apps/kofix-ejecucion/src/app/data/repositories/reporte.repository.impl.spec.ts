import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ReporteRepositoryImpl } from './reporte.repository.impl';
import { environment } from '../../../environments/environment';

describe('ReporteRepositoryImpl', () => {
    let service: ReporteRepositoryImpl;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [HttpClientTestingModule], providers: [ReporteRepositoryImpl] });
        service = TestBed.inject(ReporteRepositoryImpl);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('pide el avance mensual con las fechas del corte y devuelve los datos', (done) => {
        const datos = { fechaInicio: '2026-01-01', fechaFin: '2026-12-31', umbrales: { buena: 90, regular: 70 }, meses: [], filas: [], totalNacional: {} };
        service.getAvanceMensual('2026-01-01', '2026-12-31').subscribe(reporte => {
            expect(reporte).toEqual(datos);
            done();
        });

        const req = httpMock.expectOne(r => r.url === `${environment.apiEjecucion}/reportes/avance-mensual`);
        expect(req.request.params.get('fechaInicio')).toBe('2026-01-01');
        expect(req.request.params.get('fechaFin')).toBe('2026-12-31');
        req.flush({ exitoso: true, datos });
    });
});

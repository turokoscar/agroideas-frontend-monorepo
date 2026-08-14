import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AlertaRepositoryImpl } from './alerta.repository.impl';
import { environment } from '../../../environments/environment';

describe('AlertaRepositoryImpl', () => {
    let service: AlertaRepositoryImpl;
    let httpMock: HttpTestingController;
    const baseUrl = `${environment.apiEjecucion}/convenios/alertas`;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [AlertaRepositoryImpl]
        });
        service = TestBed.inject(AlertaRepositoryImpl);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('should default pagina/cantidad and omit optional filters when not provided', () => {
        service.getAlertas().subscribe();

        const req = httpMock.expectOne(
            (r) => r.url === baseUrl && r.params.get('pagina') === '1' && r.params.get('cantidad') === '10'
        );
        expect(req.request.params.has('tipo')).toBe(false);
        expect(req.request.params.has('severidad')).toBe(false);

        req.flush({ datos: { items: [], kpis: {} }, total: 0 });
    });

    it('should forward tipo and severidad filters when provided', () => {
        service.getAlertas({ pagina: 2, cantidad: 20, tipo: 'FIN_PLAN', severidad: 'Alta' }).subscribe();

        const req = httpMock.expectOne(
            (r) =>
                r.url === baseUrl &&
                r.params.get('pagina') === '2' &&
                r.params.get('cantidad') === '20' &&
                r.params.get('tipo') === 'FIN_PLAN' &&
                r.params.get('severidad') === 'Alta'
        );

        req.flush({ datos: { items: [], kpis: {} }, total: 0 });
    });

    it('should fall back total to kpis.totalAlertas when the top-level total is missing', (done) => {
        service.getAlertas().subscribe((res) => {
            expect(res.total).toBe(7);
            done();
        });

        httpMock.expectOne((r) => r.url === baseUrl).flush({ datos: { items: [], kpis: { totalAlertas: 7 } } });
    });

    it('should map items and kpis through AlertaMapper', (done) => {
        service.getAlertas().subscribe((res) => {
            expect(res.items).toHaveLength(1);
            expect(res.items[0].id).toBe(50);
            expect(res.kpis.totalAlertas).toBe(3);
            done();
        });

        httpMock.expectOne((r) => r.url === baseUrl).flush({
            total: 3,
            datos: {
                items: [{ id: 50, postulanteId: 1, tipo: 'FIN_PLAN', tipoLabel: 'Fin de Plan', fecha: '2026-08-01', numeroConvenio: 'CONV-001', organizacion: 'Org', severidad: 'Alta', mensaje: 'Msg' }],
                kpis: { kpiFinPlan: 1, kpiSinEjecucion: 1, kpiVarianzas: 1, totalAlertas: 3 }
            }
        });
    });
});

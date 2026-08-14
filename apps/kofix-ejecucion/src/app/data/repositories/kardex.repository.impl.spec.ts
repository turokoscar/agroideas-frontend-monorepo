import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { KardexRepositoryImpl } from './kardex.repository.impl';
import { environment } from '../../../environments/environment';

describe('KardexRepositoryImpl', () => {
    let service: KardexRepositoryImpl;
    let httpMock: HttpTestingController;
    const baseUrl = `${environment.apiEjecucion}/kardex`;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [KardexRepositoryImpl]
        });
        service = TestBed.inject(KardexRepositoryImpl);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('should omit tip_operacion/est_estado params when they are "all"', () => {
        service.getMovimientos('all', 'all').subscribe();

        const req = httpMock.expectOne((r) => r.url === `${baseUrl}/movimientos`);
        expect(req.request.params.has('tip_operacion')).toBe(false);
        expect(req.request.params.has('est_estado')).toBe(false);
        req.flush({ datos: [] });
    });

    it('should forward a specific tipo/estado as filter params', () => {
        service.getMovimientos('Gasto', 'Aprobado').subscribe();

        httpMock.expectOne((r) => r.url === `${baseUrl}/movimientos` && r.params.get('tip_operacion') === 'Gasto' && r.params.get('est_estado') === 'Aprobado').flush({ datos: [] });
    });

    it('should read a bare array response and fill in field defaults per movement', (done) => {
        service.getMovimientos().subscribe((res) => {
            expect(res.items).toEqual([
                { id: 1, convenioId: 5, numeroConvenio: '', organizacion: '', fecha: '', tipo: 'Gasto', documento: '', periodo: '', monto: 0, saldoResultante: 0, usuario: '', estado: 'Aprobado' }
            ]);
            done();
        });

        httpMock.expectOne((r) => r.url === `${baseUrl}/movimientos`).flush({ datos: [{ id: 1, convenioId: 5 }] });
    });

    it('should read items from a wrapped { items } object when datos is not a bare array', (done) => {
        service.getMovimientos().subscribe((res) => {
            expect(res.items).toHaveLength(1);
            expect(res.total).toBe(3);
            done();
        });

        httpMock.expectOne((r) => r.url === `${baseUrl}/movimientos`).flush({ datos: { items: [{ id: 1, convenioId: 5 }], total: 3 } });
    });

    it('should prefer the backend summary, accepting either camelCase or PascalCase keys', (done) => {
        service.getMovimientos().subscribe((res) => {
            expect(res.summary).toEqual({ totalMovimientos: 10, totalGastos: 400, totalIngresos: 900 });
            done();
        });

        httpMock.expectOne((r) => r.url === `${baseUrl}/movimientos`).flush({
            datos: { items: [], summary: { TotalMovimientos: 10, totalGastos: 400, TotalIngresos: 900 } }
        });
    });

    it('should compute the summary locally from the items when the backend sends none', (done) => {
        service.getMovimientos().subscribe((res) => {
            expect(res.summary).toEqual({ totalMovimientos: 2, totalGastos: 50, totalIngresos: 200 });
            done();
        });

        httpMock.expectOne((r) => r.url === `${baseUrl}/movimientos`).flush({
            datos: [
                { id: 1, monto: 200 },
                { id: 2, monto: -50 }
            ]
        });
    });

    it('should pass through the detalle datos as-is, without a fallback default', (done) => {
        // A diferencia de los demás métodos, este usa `res.datos!` sin `|| {}`: si el backend
        // no manda datos, el observable emite undefined en vez de fallar o dar un valor por defecto.
        service.getDetallePorItem(3, 9).subscribe((detalle) => {
            expect(detalle).toBeUndefined();
            done();
        });

        httpMock.expectOne(`${baseUrl}/detalle/3/9`).flush({});
    });
});

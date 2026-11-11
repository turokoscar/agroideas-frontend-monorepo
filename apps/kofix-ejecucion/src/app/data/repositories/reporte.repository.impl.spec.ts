import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ReporteRepositoryImpl, extraerNombreArchivo } from './reporte.repository.impl';
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

    it('descarga el Excel y el PDF como blob tomando el nombre de Content-Disposition', (done) => {
        const blobEsperado = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
        service.descargarAvanceMensual('2026-07-01', '2026-08-31', 'pdf').subscribe(res => {
            expect(res.blob).toEqual(blobEsperado);
            expect(res.nombreArchivo).toBe('avance-mensual_2026-07-01_2026-08-31.pdf');
            done();
        });

        const req = httpMock.expectOne(r => r.url === `${environment.apiEjecucion}/reportes/avance-mensual/pdf`);
        expect(req.request.responseType).toBe('blob');
        expect(req.request.params.get('fechaInicio')).toBe('2026-07-01');
        expect(req.request.params.get('fechaFin')).toBe('2026-08-31');
        req.flush(blobEsperado, { headers: { 'Content-Disposition': 'attachment; filename="avance-mensual_2026-07-01_2026-08-31.pdf"' } });
    });

    it('extrae el nombre de Content-Disposition en formato RFC 5987 o usa el nombre por defecto', () => {
        expect(extraerNombreArchivo("attachment; filename*=UTF-8''reporte%20avance.xlsx", 'def.xlsx')).toBe('reporte avance.xlsx');
        expect(extraerNombreArchivo(null, 'def.xlsx')).toBe('def.xlsx');
    });
});

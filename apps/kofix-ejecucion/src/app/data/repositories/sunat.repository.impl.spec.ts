import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SunatRepositoryImpl } from './sunat.repository.impl';
import { environment } from '../../../environments/environment';

describe('SunatRepositoryImpl', () => {
    let service: SunatRepositoryImpl;
    let httpMock: HttpTestingController;
    const baseUrl = `${environment.apiEjecucion}/sunat`;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [SunatRepositoryImpl]
        });
        service = TestBed.inject(SunatRepositoryImpl);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('should fetch the razón social for a given RUC', (done) => {
        service.consultarRuc('10439931642').subscribe((res) => {
            expect(res.ruc).toBe('10439931642');
            expect(res.razonSocial).toBe('ACME SAC');
            done();
        });

        const req = httpMock.expectOne(`${baseUrl}/ruc/10439931642`);
        req.flush({ exitoso: true, datos: { ruc: '10439931642', razonSocial: 'ACME SAC', estaActivo: 'ACTIVO', estaHabido: 'HABIDO' } });
    });
});

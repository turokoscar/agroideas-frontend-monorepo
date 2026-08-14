import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CatalogoRepositoryImpl } from './catalogo.repository.impl';
import { environment } from '../../../environments/environment';

describe('CatalogoRepositoryImpl', () => {
    let service: CatalogoRepositoryImpl;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [CatalogoRepositoryImpl]
        });
        service = TestBed.inject(CatalogoRepositoryImpl);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('should request the given group and stamp grupoId on each mapped item', (done) => {
        service.getByGrupo('TIPO_DOCUMENTO').subscribe((items) => {
            expect(items).toEqual([{ id: 1, codigo: 'DNI', descripcion: 'Documento Nacional', grupoId: 'TIPO_DOCUMENTO' }]);
            done();
        });

        const req = httpMock.expectOne(`${environment.apiEjecucion}/catalogos/grupo/TIPO_DOCUMENTO`);
        req.flush({ exitoso: true, datos: [{ id: 1, codigo: 'DNI', descripcion: 'Documento Nacional' }] });
    });

    it('should default to an empty array when the API returns no datos', (done) => {
        service.getByGrupo('VACIO').subscribe((items) => {
            expect(items).toEqual([]);
            done();
        });

        httpMock.expectOne(`${environment.apiEjecucion}/catalogos/grupo/VACIO`).flush({ exitoso: true });
    });
});

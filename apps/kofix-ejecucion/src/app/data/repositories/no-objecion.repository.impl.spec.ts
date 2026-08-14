import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NoObjecionRepositoryImpl } from './no-objecion.repository.impl';
import { FileStorageService } from '../../shared/services/file-storage.service';
import { environment } from '../../../environments/environment';
import { of } from 'rxjs';

describe('NoObjecionRepositoryImpl', () => {
    let service: NoObjecionRepositoryImpl;
    let httpMock: HttpTestingController;
    let mockFileStorage: jest.Mocked<Partial<FileStorageService>>;
    const baseUrl = `${environment.apiEjecucion}/no-objeciones`;

    beforeEach(() => {
        mockFileStorage = { uploadFile: jest.fn(), downloadFile: jest.fn() };

        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [NoObjecionRepositoryImpl, { provide: FileStorageService, useValue: mockFileStorage }]
        });
        service = TestBed.inject(NoObjecionRepositoryImpl);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('should only add includeItemIds as a comma-joined param when the list is non-empty', () => {
        service.getProgrammedItemsWithBalance(3).subscribe();
        const req1 = httpMock.expectOne((r) => r.url === `${baseUrl}/postulante/3/items-programados`);
        expect(req1.request.params.has('includeItemIds')).toBe(false);
        req1.flush({ datos: [] });

        service.getProgrammedItemsWithBalance(3, [1, 2, 3]).subscribe();
        httpMock.expectOne((r) => r.url === `${baseUrl}/postulante/3/items-programados` && r.params.get('includeItemIds') === '1,2,3').flush({ datos: [] });
    });

    it('should return an empty array when getProgrammedItemsWithBalance has no datos', (done) => {
        service.getProgrammedItemsWithBalance(3).subscribe((items) => {
            expect(items).toEqual([]);
            done();
        });

        httpMock.expectOne((r) => r.url === `${baseUrl}/postulante/3/items-programados`).flush({});
    });

    it('should map each key of the balances response through NoObjecionMapper.fromBalanceApi', (done) => {
        service.getBalances(3).subscribe((balances) => {
            expect(Object.keys(balances)).toEqual(['10']);
            expect(balances['10'].montoComprometido).toBe(500);
            done();
        });

        httpMock.expectOne(`${baseUrl}/postulante/3/balances`).flush({
            datos: { '10': { MontoComprometido: 500, CantidadComprometida: 2 } }
        });
    });

    it('should return an empty balances object when there is no datos', (done) => {
        service.getBalances(3).subscribe((balances) => {
            expect(balances).toEqual({});
            done();
        });

        httpMock.expectOne(`${baseUrl}/postulante/3/balances`).flush({});
    });

    it('should delegate uploadFile/downloadFile to FileStorageService with the "no-objeciones" subdirectory', () => {
        const file = new File([new Uint8Array(10)], 'no-objecion.pdf', { type: 'application/pdf' });
        mockFileStorage.uploadFile = jest.fn().mockReturnValue(of({ fileUrl: 'abc' }));
        mockFileStorage.downloadFile = jest.fn().mockReturnValue(of(new Blob()));

        service.uploadFile(file).subscribe();
        expect(mockFileStorage.uploadFile).toHaveBeenCalledWith(file, 'no-objeciones');

        service.downloadFile('abc').subscribe();
        expect(mockFileStorage.downloadFile).toHaveBeenCalledWith('abc');
    });

    it('should build the create() request through NoObjecionMapper.toApiRequest', () => {
        service.create({ tipoDocumentoId: 1, numeroDocumento: 'DOC-1', fechaDocumento: '2026-08-01', postulanteId: 3, detalles: [] }).subscribe();

        const req = httpMock.expectOne(baseUrl);
        expect(req.request.method).toBe('POST');
        expect(req.request.body.numeroDocumento).toBe('DOC-1');
        req.flush({ respuesta: 'OK' });
    });
});

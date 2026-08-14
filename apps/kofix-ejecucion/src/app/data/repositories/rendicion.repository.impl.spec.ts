import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RendicionRepositoryImpl } from './rendicion.repository.impl';
import { FileStorageService } from '../../shared/services/file-storage.service';
import { environment } from '../../../environments/environment';
import { of } from 'rxjs';

describe('RendicionRepositoryImpl', () => {
    let service: RendicionRepositoryImpl;
    let httpMock: HttpTestingController;
    let mockFileStorage: jest.Mocked<Partial<FileStorageService>>;
    const baseUrl = `${environment.apiEjecucion}/rendiciones`;

    beforeEach(() => {
        mockFileStorage = { uploadFile: jest.fn() };

        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [RendicionRepositoryImpl, { provide: FileStorageService, useValue: mockFileStorage }]
        });
        service = TestBed.inject(RendicionRepositoryImpl);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('should only add sunatCpeId/numeroSolicitud params when provided', () => {
        service.getByConvenio(3, 0, 10).subscribe();
        const req1 = httpMock.expectOne((r) => r.url === `${baseUrl}/convenio/3`);
        expect(req1.request.params.has('sunatCpeId')).toBe(false);
        expect(req1.request.params.has('numeroSolicitud')).toBe(false);
        req1.flush({ datos: [], total: 0 });

        service.getByConvenio(3, 0, 10, 99, 'SOL-1').subscribe();
        httpMock
            .expectOne((r) => r.url === `${baseUrl}/convenio/3` && r.params.get('sunatCpeId') === '99' && r.params.get('numeroSolicitud') === 'SOL-1')
            .flush({ datos: [], total: 0 });
    });

    it('should map the rendiciones list and default the total', (done) => {
        service.getByConvenio(3, 0, 10).subscribe((res) => {
            expect(res.items).toHaveLength(1);
            expect(res.items[0].id).toBe(1);
            expect(res.total).toBe(0);
            done();
        });

        httpMock.expectOne((r) => r.url === `${baseUrl}/convenio/3`).flush({
            datos: [{ id: 1, solicitudDesembolsoId: 1, sunatCpeId: 1, numeroSolicitud: 'S1', tipoCpe: 'FACTURA', serie: 'F1', numero: '1', serieNumero: 'F1-1', fechaEmision: '2026-08-01', total: 100, observacion: '', estado: 1 }]
        });
    });

    it('should delegate uploadFile to FileStorageService with the "rendiciones" subdirectory', () => {
        const file = new File([new Uint8Array(10)], 'comprobante.pdf', { type: 'application/pdf' });
        mockFileStorage.uploadFile = jest.fn().mockReturnValue(of({ fileUrl: 'abc' }));

        service.uploadFile(file).subscribe();

        expect(mockFileStorage.uploadFile).toHaveBeenCalledWith(file, 'rendiciones');
    });

    it('should default getPendientes to an empty array', (done) => {
        service.getPendientes(3).subscribe((items) => {
            expect(items).toEqual([]);
            done();
        });

        httpMock.expectOne(`${baseUrl}/postulante/3/pendientes`).flush({});
    });
});

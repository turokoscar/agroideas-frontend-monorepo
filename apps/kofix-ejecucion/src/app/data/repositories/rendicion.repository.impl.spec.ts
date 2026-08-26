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

    it('should delegate downloadFile to FileStorageService', () => {
        const blob = new Blob(['x']);
        mockFileStorage.downloadFile = jest.fn().mockReturnValue(of(blob));

        service.downloadFile('abc-url').subscribe((res) => {
            expect(res).toBe(blob);
        });

        expect(mockFileStorage.downloadFile).toHaveBeenCalledWith('abc-url');
    });

    it('should default getPendientes to an empty array', (done) => {
        service.getPendientes(3).subscribe((items) => {
            expect(items).toEqual([]);
            done();
        });

        httpMock.expectOne(`${baseUrl}/postulante/3/pendientes`).flush({});
    });

    it('should default getGastosF1 to an empty array', (done) => {
        service.getGastosF1(3).subscribe((items) => {
            expect(items).toEqual([]);
            done();
        });

        httpMock.expectOne(`${baseUrl}/convenio/3/gastos-f1`).flush({});
    });

    it('should fetch the gastos F1 for a convenio', (done) => {
        const gastos = [{ rendicionId: 1, itemNombre: 'Fertilizante', unidadMedida: 'UNIDAD', cantidad: 2, precioAdjudicado: 500, montoRendido: 300, fechaEmision: '2026-08-01', serieNumero: 'F001-123', tipoCpe: 'FACTURA' }];

        service.getGastosF1(3).subscribe((res) => {
            expect(res).toEqual(gastos);
            done();
        });

        httpMock.expectOne(`${baseUrl}/convenio/3/gastos-f1`).flush({ datos: gastos });
    });

    it('should fetch a rendición by id with its real detalle', (done) => {
        const detalle = {
            id: 9, solicitudDesembolsoId: 1, sunatCpeId: 1, serie: 'F001', numero: '123',
            fechaEmision: '2026-08-01', total: 300, observacion: '', estado: 1,
            detalles: [{ solicitudDesembolsoDetId: 100, itemNombre: 'Fertilizante', montoDesembolsado: 500, montoRendido: 300, saldoDisponible: 500 }]
        };

        service.getById(9).subscribe((res) => {
            expect(res).toEqual(detalle);
            done();
        });

        httpMock.expectOne(`${baseUrl}/9`).flush({ datos: detalle });
    });
});

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FileStorageService } from './file-storage.service';
import { environment } from '../../../environments/environment';

describe('FileStorageService', () => {
    let service: FileStorageService;
    let httpMock: HttpTestingController;

    const buildFile = (options: { size?: number; type?: string; name?: string } = {}): File => {
        const { size = 1024, type = 'application/pdf', name = 'documento.pdf' } = options;
        const file = new File([new Uint8Array(size)], name, { type });
        return file;
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [FileStorageService]
        });

        service = TestBed.inject(FileStorageService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    describe('validateFile', () => {
        it('should accept a well-formed PDF under the size limit', () => {
            expect(service.validateFile(buildFile())).toEqual({ valid: true });
        });

        it('should reject a missing file', () => {
            expect(service.validateFile(null as unknown as File).valid).toBe(false);
        });

        it('should reject an empty file', () => {
            const result = service.validateFile(buildFile({ size: 0 }));
            expect(result).toEqual({ valid: false, error: 'El archivo está vacío.' });
        });

        it('should reject a file over 10MB', () => {
            const result = service.validateFile(buildFile({ size: 11 * 1024 * 1024 }));
            expect(result.valid).toBe(false);
            expect(result.error).toContain('10MB');
        });

        it('should reject a non-.pdf extension', () => {
            const result = service.validateFile(buildFile({ name: 'documento.docx', type: 'application/pdf' }));
            expect(result.valid).toBe(false);
            expect(result.error).toContain('PDF');
        });

        it('should reject a mismatched MIME type even with a .pdf extension', () => {
            const result = service.validateFile(buildFile({ type: 'image/png' }));
            expect(result.valid).toBe(false);
            expect(result.error).toContain('PDF');
        });
    });

    describe('uploadFile', () => {
        it('should reject an invalid file without issuing an HTTP request', (done) => {
            service.uploadFile(buildFile({ size: 0 })).subscribe({
                error: (err) => {
                    expect(err.message).toBe('El archivo está vacío.');
                    httpMock.expectNone(`${environment.apiArchivos}/archivos`);
                    done();
                }
            });
        });

        it('should default codProceso to GENERAL when no subDirectory is given', () => {
            service.uploadFile(buildFile()).subscribe();

            const req = httpMock.expectOne(`${environment.apiArchivos}/archivos`);
            const body = req.request.body as FormData;
            expect(body.get('codProceso')).toBe('GENERAL');
            expect(body.get('codSistema')).toBe('KOFIX');

            req.flush({ respuesta: 'OK', mensaje: '', datos: { ideArchivo: 'abc-123' } });
        });

        it('should map subDirectory to the matching codProceso', () => {
            service.uploadFile(buildFile(), 'no-objeciones').subscribe();
            const req1 = httpMock.expectOne(`${environment.apiArchivos}/archivos`);
            expect((req1.request.body as FormData).get('codProceso')).toBe('NO_OBJECIONES');
            req1.flush({ respuesta: 'OK', mensaje: '', datos: { ideArchivo: '1' } });

            service.uploadFile(buildFile(), 'rendiciones').subscribe();
            const req2 = httpMock.expectOne(`${environment.apiArchivos}/archivos`);
            expect((req2.request.body as FormData).get('codProceso')).toBe('RENDICIONES');
            req2.flush({ respuesta: 'OK', mensaje: '', datos: { ideArchivo: '2' } });
        });

        it('should resolve to the uploaded file URL from the response', (done) => {
            service.uploadFile(buildFile()).subscribe((result) => {
                expect(result).toEqual({ fileUrl: 'abc-123' });
                done();
            });

            const req = httpMock.expectOne(`${environment.apiArchivos}/archivos`);
            req.flush({ respuesta: 'OK', mensaje: '', datos: { ideArchivo: 'abc-123' } });
        });
    });

    describe('downloadFile', () => {
        it('should hit the archivos API when the identifier is a GUID', () => {
            const guid = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

            service.downloadFile(guid).subscribe();

            const req = httpMock.expectOne(`${environment.apiArchivos}/archivos/${guid}/descarga`);
            expect(req.request.responseType).toBe('blob');
            req.flush(new Blob());
        });

        it('should fall back to the legacy download endpoint for a plain filename', () => {
            service.downloadFile('reporte final.pdf').subscribe();

            const req = httpMock.expectOne(`${environment.apiEjecucion}/archivos/download/${encodeURIComponent('reporte final.pdf')}`);
            expect(req.request.responseType).toBe('blob');
            req.flush(new Blob());
        });
    });

    describe('deleteFile', () => {
        it('should hit the archivos API when the identifier is a GUID', () => {
            const guid = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

            service.deleteFile(guid).subscribe();

            httpMock.expectOne(`${environment.apiArchivos}/archivos/${guid}`).flush({});
        });

        it('should fall back to the legacy delete endpoint for a plain filename', () => {
            service.deleteFile('legacy.pdf').subscribe();

            httpMock.expectOne(`${environment.apiEjecucion}/archivos/delete/legacy.pdf`).flush({});
        });
    });
});

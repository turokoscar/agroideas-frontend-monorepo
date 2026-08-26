import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AlertService } from '@agroideas/feedback';
import { ActivarChequeModalComponent } from './activar-cheque-modal.component';
import { DesembolsoRepository } from '../../../domain/repositories/desembolso.repository';
import { DesembolsoChequePendiente } from '../../../domain/models/desembolso.model';

describe('ActivarChequeModalComponent', () => {
    let component: ActivarChequeModalComponent;
    let fixture: ComponentFixture<ActivarChequeModalComponent>;
    let mockDesembolsoRepo: jest.Mocked<Partial<DesembolsoRepository>>;
    let mockAlert: jest.Mocked<Partial<AlertService>>;

    const cheque: DesembolsoChequePendiente = {
        id: 20003,
        ideCheque: 2,
        correlativo: 'CH-2202-0001',
        postulanteId: 2202,
        numeroSolicitud: 'SD-001',
        monto: 500,
        fechaDevengado: '2026-08-26'
    };

    const buildPdfFile = () => new File(['contenido'], 'sustento.pdf', { type: 'application/pdf' });
    const fileInputEvent = (file: File) => ({ target: { files: [file] } }) as unknown as Event;

    beforeEach(async () => {
        mockDesembolsoRepo = {
            uploadFile: jest.fn().mockReturnValue(of({ fileUrl: 'a1b2c3d4-0000-0000-0000-000000000000' })),
            activarCheque: jest.fn().mockReturnValue(of(null))
        };
        mockAlert = { show: jest.fn(), toast: jest.fn() };

        await TestBed.configureTestingModule({
            imports: [ActivarChequeModalComponent],
            providers: [
                { provide: DesembolsoRepository, useValue: mockDesembolsoRepo },
                { provide: AlertService, useValue: mockAlert }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ActivarChequeModalComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('cheque', cheque);
    });

    it('should upload the file and store the returned fileUrl when a PDF is selected', () => {
        fixture.detectChanges();

        component.onFileSelected(fileInputEvent(buildPdfFile()));

        expect(mockDesembolsoRepo.uploadFile).toHaveBeenCalledWith(expect.any(File));
        expect(component.fileUrl()).toBe('a1b2c3d4-0000-0000-0000-000000000000');
    });

    it('should reject a non-PDF file without uploading', () => {
        fixture.detectChanges();
        const txtFile = new File(['x'], 'sustento.txt', { type: 'text/plain' });

        component.onFileSelected(fileInputEvent(txtFile));

        expect(mockDesembolsoRepo.uploadFile).not.toHaveBeenCalled();
        expect(mockAlert.show).toHaveBeenCalledWith('Formato no válido', expect.any(String), 'warning');
    });

    it('should clear the selection on upload error', () => {
        fixture.detectChanges();
        mockDesembolsoRepo.uploadFile = jest.fn().mockReturnValue(throwError(() => ({ error: { mensaje: 'boom' } })));

        component.onFileSelected(fileInputEvent(buildPdfFile()));

        expect(component.selectedFile()).toBeNull();
        expect(component.fileUrl()).toBeNull();
        expect(mockAlert.show).toHaveBeenCalledWith('Error', 'boom', 'error');
    });

    it('should not save when no file has been uploaded yet', () => {
        fixture.detectChanges();

        component.save();

        expect(mockDesembolsoRepo.activarCheque).not.toHaveBeenCalled();
        expect(mockAlert.toast).toHaveBeenCalled();
    });

    it('should activate the cheque with the correlativo file url and emit onClose(true) on success', () => {
        fixture.detectChanges();
        const emitSpy = jest.spyOn(component.onClose, 'emit');
        component.onFileSelected(fileInputEvent(buildPdfFile()));

        component.save();

        expect(mockDesembolsoRepo.activarCheque).toHaveBeenCalledWith(20003, 'a1b2c3d4-0000-0000-0000-000000000000');
        expect(mockAlert.show).toHaveBeenCalledWith('Éxito', expect.any(String), 'success');
        expect(emitSpy).toHaveBeenCalledWith(true);
    });

    it('should show an error and not close the modal when activation fails', () => {
        fixture.detectChanges();
        mockDesembolsoRepo.activarCheque = jest.fn().mockReturnValue(throwError(() => ({ error: { mensaje: 'cheque ya girado' } })));
        const emitSpy = jest.spyOn(component.onClose, 'emit');
        component.onFileSelected(fileInputEvent(buildPdfFile()));

        component.save();

        expect(mockAlert.show).toHaveBeenCalledWith('Error', 'cheque ya girado', 'error');
        expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should clear the file on removeFile', () => {
        fixture.detectChanges();
        component.onFileSelected(fileInputEvent(buildPdfFile()));

        component.removeFile();

        expect(component.selectedFile()).toBeNull();
        expect(component.fileUrl()).toBeNull();
    });
});

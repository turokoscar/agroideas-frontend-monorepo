import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AlertService } from '@agroideas/feedback';
import { RendicionModalComponent } from './rendicion-modal.component';
import { CatalogoRepository } from '../../../domain/repositories/catalogo.repository';
import { RendicionRepository } from '../../../domain/repositories/rendicion.repository';
import { Rendicion } from '../../../domain/models/rendicion.model';
import { ConvenioStateService } from '../../../shared/services/convenio-state.service';

describe('RendicionModalComponent', () => {
    let component: RendicionModalComponent;
    let fixture: ComponentFixture<RendicionModalComponent>;
    let mockCatalogoRepo: jest.Mocked<Partial<CatalogoRepository>>;
    let mockRendicionRepo: jest.Mocked<Partial<RendicionRepository>>;
    let mockAlert: jest.Mocked<Partial<AlertService>>;
    let mockStateService: jest.Mocked<Partial<ConvenioStateService>>;

    const pendiente = {
        id: 1,
        detalles: [
            { solicitudDesembolsoDetId: 100, itemNombre: 'Fertilizante', montoDesembolsado: 500, saldoPendiente: 300 },
            { solicitudDesembolsoDetId: 101, itemNombre: 'Semillas', montoDesembolsado: 200, saldoPendiente: 200 }
        ]
    };

    const setInputs = (overrides: { rendicion?: Rendicion | null } = {}) => {
        fixture.componentRef.setInput('visible', true);
        fixture.componentRef.setInput('convenioId', 5);
        fixture.componentRef.setInput('rendicion', overrides.rendicion ?? null);
    };

    beforeEach(async () => {
        mockCatalogoRepo = { getByGrupo: jest.fn().mockReturnValue(of([])) };
        mockRendicionRepo = {
            getPendientes: jest.fn().mockReturnValue(of([pendiente])),
            uploadFile: jest.fn(),
            create: jest.fn(),
            update: jest.fn()
        };
        mockAlert = { show: jest.fn(), toast: jest.fn() };
        mockStateService = { convenio: jest.fn().mockReturnValue(null) as unknown as ConvenioStateService['convenio'] };

        await TestBed.configureTestingModule({
            imports: [RendicionModalComponent],
            providers: [
                { provide: CatalogoRepository, useValue: mockCatalogoRepo },
                { provide: RendicionRepository, useValue: mockRendicionRepo },
                { provide: AlertService, useValue: mockAlert },
                { provide: ConvenioStateService, useValue: mockStateService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(RendicionModalComponent);
        component = fixture.componentInstance;
    });

    it('should load the pendientes for the convenio on init', () => {
        setInputs();
        fixture.detectChanges();

        expect(mockRendicionRepo.getPendientes).toHaveBeenCalledWith(5);
    });

    it('should format the solicitud number padded to 4 digits plus the year of fechaSolicitud', () => {
        expect(component.formatSolicitudNumber({ numeroSolicitud: '23', fechaSolicitud: '2026-01-10' })).toBe('0023-2026');
    });

    it('should populate the detalles form array when a solicitud is selected', () => {
        setInputs();
        fixture.detectChanges();

        component.form.get('solicitudDesembolsoId')?.setValue(1);

        expect(component.detallesFormArray.length).toBe(2);
        expect(component.selectedDesembolso()).toEqual(pendiente);
    });

    it('should clear the detalles when the solicitud is unselected', () => {
        setInputs();
        fixture.detectChanges();
        component.form.get('solicitudDesembolsoId')?.setValue(1);

        component.form.get('solicitudDesembolsoId')?.setValue(null);

        expect(component.detallesFormArray.length).toBe(0);
        expect(component.selectedDesembolso()).toBeNull();
    });

    describe('onItemSelectionChange', () => {
        beforeEach(() => {
            setInputs();
            fixture.detectChanges();
            component.form.get('solicitudDesembolsoId')?.setValue(1);
            component.form.get('totalComprobante')?.setValue(400);
        });

        it('should auto-fill the lesser of the remaining factura amount and the item saldo', () => {
            component.detallesFormArray.at(0).get('selected')?.setValue(true);

            component.onItemSelectionChange(0);

            // restante factura = 400, saldo item = 300 -> min = 300
            expect(component.detallesFormArray.at(0).get('montoRendido')?.value).toBe(300);
        });

        it('should cap the auto-fill by what is left in the factura once another item is already selected', () => {
            component.detallesFormArray.at(0).get('selected')?.setValue(true);
            component.onItemSelectionChange(0); // consumes 300 of 400

            component.detallesFormArray.at(1).get('selected')?.setValue(true);
            component.onItemSelectionChange(1);

            // restante factura = 400 - 300 = 100, saldo item = 200 -> min = 100
            expect(component.detallesFormArray.at(1).get('montoRendido')?.value).toBe(100);
        });

        it('should reset the montoRendido and clear validators when deselecting an item', () => {
            component.detallesFormArray.at(0).get('selected')?.setValue(true);
            component.onItemSelectionChange(0);

            component.detallesFormArray.at(0).get('selected')?.setValue(false);
            component.onItemSelectionChange(0);

            expect(component.detallesFormArray.at(0).get('montoRendido')?.value).toBe(0);
        });
    });

    describe('totalDistribuido / isDistribucionCuadrada', () => {
        it('should only sum montoRendido from selected rows', () => {
            setInputs();
            fixture.detectChanges();
            component.form.get('solicitudDesembolsoId')?.setValue(1);

            component.detallesFormArray.at(0).patchValue({ selected: true, montoRendido: 150 });
            component.detallesFormArray.at(1).patchValue({ selected: false, montoRendido: 999 });

            expect(component.totalDistribuido).toBe(150);
        });

        it('should be square only within a small tolerance of the total', () => {
            setInputs();
            fixture.detectChanges();
            component.form.get('solicitudDesembolsoId')?.setValue(1);
            component.form.get('totalComprobante')?.setValue(150);

            component.detallesFormArray.at(0).patchValue({ selected: true, montoRendido: 150 });
            expect(component.isDistribucionCuadrada).toBe(true);

            component.detallesFormArray.at(0).patchValue({ montoRendido: 140 });
            expect(component.isDistribucionCuadrada).toBe(false);
        });
    });

    describe('onFileSelected', () => {
        it('should reject a non-PDF file', () => {
            setInputs();
            fixture.detectChanges();
            const event = { target: { files: [new File([], 'x.docx', { type: 'application/msword' })] } };

            component.onFileSelected(event);

            expect(component.selectedFile()).toBeNull();
            expect(mockAlert.show).toHaveBeenCalledWith('Formato no válido', expect.any(String), 'warning');
        });

        it('should upload a valid PDF and store the returned url', () => {
            setInputs();
            fixture.detectChanges();
            mockRendicionRepo.uploadFile = jest.fn().mockReturnValue(of({ fileUrl: 'abc-url' }));
            const file = new File([], 'comprobante.pdf', { type: 'application/pdf' });

            component.onFileSelected({ target: { files: [file] } });

            expect(mockRendicionRepo.uploadFile).toHaveBeenCalledWith(file);
            expect(component.fileUrl()).toBe('abc-url');
        });
    });

    describe('save', () => {
        const fillValidForm = () => {
            component.form.setValue({
                solicitudDesembolsoId: 1,
                sunatCpeId: 1,
                serie: 'F001',
                numero: '000123',
                fechaEmision: '2026-08-01',
                totalComprobante: 300,
                observacion: '',
                detalles: []
            });
        };

        beforeEach(() => {
            setInputs();
            fixture.detectChanges();
            component.form.get('solicitudDesembolsoId')?.setValue(1);
            component.form.patchValue({ sunatCpeId: 1, serie: 'F001', numero: '000123', fechaEmision: '2026-08-01', totalComprobante: 300 });
        });

        it('should require at least one selected detalle', () => {
            component.save();

            expect(mockAlert.show).toHaveBeenCalledWith('Distribución requerida', expect.any(String), 'warning');
            expect(mockRendicionRepo.create).not.toHaveBeenCalled();
        });

        it('should require the distribution to match the total exactly', () => {
            component.detallesFormArray.at(0).patchValue({ selected: true, montoRendido: 100 });

            component.save();

            expect(mockAlert.show).toHaveBeenCalledWith('Distribución incompleta o incorrecta', expect.any(String), 'warning');
            expect(mockRendicionRepo.create).not.toHaveBeenCalled();
        });

        it('should require a comprobante file when creating', () => {
            component.detallesFormArray.at(0).patchValue({ selected: true, montoRendido: 300 });

            component.save();

            expect(mockAlert.show).toHaveBeenCalledWith('Archivo requerido', expect.any(String), 'warning');
            expect(mockRendicionRepo.create).not.toHaveBeenCalled();
        });

        it('should create the rendicion once the distribution and file are valid', () => {
            component.detallesFormArray.at(0).patchValue({ selected: true, montoRendido: 300 });
            component.fileUrl.set('abc-url');
            mockRendicionRepo.create = jest.fn().mockReturnValue(of({}));

            component.save();

            expect(mockRendicionRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({ detalles: [{ solicitudDesembolsoDetId: 100, montoRendido: 300 }], archivos: [{ tipoArchivoId: 1, urlArchivo: 'abc-url' }] })
            );
            expect(mockAlert.toast).toHaveBeenCalledWith('Rendición registrada exitosamente');
        });

        it('should not require a file when editing an existing rendicion', () => {
            fixture.componentRef.setInput('rendicion', {
                id: 9,
                solicitudDesembolsoId: 1,
                sunatCpeId: 1,
                numeroSolicitud: 'SOL-1',
                tipoCpe: 'FACTURA',
                serie: 'F001',
                numero: '000123',
                serieNumero: 'F001-000123',
                fechaEmision: '2026-08-01',
                total: 300,
                observacion: '',
                estado: 1
            });
            component.detallesFormArray.at(0).patchValue({ selected: true, montoRendido: 300 });
            mockRendicionRepo.update = jest.fn().mockReturnValue(of({}));

            component.save();

            expect(mockRendicionRepo.update).toHaveBeenCalledWith(9, expect.any(Object));
            expect(mockAlert.toast).toHaveBeenCalledWith('Rendición actualizada exitosamente');
        });
    });
});

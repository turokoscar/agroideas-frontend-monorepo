import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AlertService } from '@agroideas/feedback';
import { NoObjecionModalComponent } from './no-objecion-modal.component';
import { NoObjecionRepository } from '../../../domain/repositories/no-objecion.repository';
import { CatalogoRepository } from '../../../domain/repositories/catalogo.repository';
import { FileStorageService } from '../../../shared/services/file-storage.service';
import { NoObjecionProgrammedItem } from '../../../domain/models/no-objecion-programmed-item.model';

describe('NoObjecionModalComponent', () => {
    let component: NoObjecionModalComponent;
    let fixture: ComponentFixture<NoObjecionModalComponent>;
    let mockNoObjecionRepo: jest.Mocked<Partial<NoObjecionRepository>>;
    let mockCatalogoRepo: jest.Mocked<Partial<CatalogoRepository>>;
    let mockFileStorage: jest.Mocked<Partial<FileStorageService>>;
    let mockAlert: jest.Mocked<Partial<AlertService>>;

    const buildItem = (overrides: Partial<NoObjecionProgrammedItem> = {}): NoObjecionProgrammedItem => ({
        id: 1,
        codigo: 'IT-1',
        nombre: 'Fertilizante',
        metaFisica: 100,
        aporteAgroideas: 1000,
        cantidadComprometida: 0,
        montoComprometido: 0,
        saldoFisico: 100,
        saldoFinanciero: 1000,
        ...overrides
    });

    beforeEach(async () => {
        mockNoObjecionRepo = {
            getProgrammedItemsWithBalance: jest.fn().mockReturnValue(of([buildItem()])),
            getById: jest.fn(),
            create: jest.fn(),
            update: jest.fn()
        };
        mockCatalogoRepo = { getByGrupo: jest.fn().mockReturnValue(of([])) };
        mockFileStorage = { validateFile: jest.fn(), uploadFile: jest.fn() };
        mockAlert = { show: jest.fn(), toast: jest.fn() };

        await TestBed.configureTestingModule({
            imports: [NoObjecionModalComponent],
            providers: [
                { provide: NoObjecionRepository, useValue: mockNoObjecionRepo },
                { provide: CatalogoRepository, useValue: mockCatalogoRepo },
                { provide: FileStorageService, useValue: mockFileStorage },
                { provide: AlertService, useValue: mockAlert }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(NoObjecionModalComponent);
        component = fixture.componentInstance;
        component.convenioId = 5;
    });

    describe('create mode', () => {
        beforeEach(() => {
            component.mode = 'create';
            fixture.detectChanges();
        });

        it('should load the programmed items and start with a single empty item row', () => {
            expect(mockNoObjecionRepo.getProgrammedItemsWithBalance).toHaveBeenCalledWith(5, undefined);
            expect(component.items.length).toBe(1);
        });

        it('should require an observation-free set of required fields, and block submission when invalid', () => {
            component.save();

            expect(mockAlert.show).toHaveBeenCalledWith('Formulario Incompleto', expect.any(String), 'warning');
            expect(mockNoObjecionRepo.create).not.toHaveBeenCalled();
        });

        it('should reject duplicate items in the detail', () => {
            component.noObjecionForm.patchValue({ tipoDocumento: 1, numeroDocumento: '12', fechaDocumento: '2026-08-01' });
            component.items.at(0).patchValue({ itemId: 1, cantidad: 10, montoAdjudicado: 100, rucProveedor: '12345678901', razonSocialProveedor: 'Prov' });
            component.addItem();
            component.items.at(1).patchValue({ itemId: 1, cantidad: 5, montoAdjudicado: 50, rucProveedor: '12345678901', razonSocialProveedor: 'Prov' });

            component.save();

            expect(mockAlert.toast).toHaveBeenCalledWith('No se permiten ítems duplicados en el detalle.', 'warning');
            expect(mockNoObjecionRepo.create).not.toHaveBeenCalled();
        });

        it('should reject a cantidad exceeding the available saldoFisico', () => {
            component.noObjecionForm.patchValue({ tipoDocumento: 1, numeroDocumento: '12', fechaDocumento: '2026-08-01' });
            component.items.at(0).patchValue({ itemId: 1, cantidad: 150, montoAdjudicado: 100, rucProveedor: '12345678901', razonSocialProveedor: 'Prov' });

            component.save();

            expect(mockAlert.toast).toHaveBeenCalledWith(expect.stringContaining('saldo físico'), 'warning');
            expect(mockNoObjecionRepo.create).not.toHaveBeenCalled();
        });

        it('should reject a monto exceeding the available saldoFinanciero', () => {
            component.noObjecionForm.patchValue({ tipoDocumento: 1, numeroDocumento: '12', fechaDocumento: '2026-08-01' });
            component.items.at(0).patchValue({ itemId: 1, cantidad: 10, montoAdjudicado: 1500, rucProveedor: '12345678901', razonSocialProveedor: 'Prov' });

            component.save();

            expect(mockAlert.toast).toHaveBeenCalledWith(expect.stringContaining('saldo financiero'), 'warning');
            expect(mockNoObjecionRepo.create).not.toHaveBeenCalled();
        });

        it('should create the no-objecion with the derived precioAdjudicado when everything is valid', () => {
            component.noObjecionForm.patchValue({ tipoDocumento: 1, numeroDocumento: '12', fechaDocumento: '2026-08-01' });
            component.items.at(0).patchValue({ itemId: 1, cantidad: 10, montoAdjudicado: 100, rucProveedor: '12345678901', razonSocialProveedor: 'Prov' });
            mockNoObjecionRepo.create = jest.fn().mockReturnValue(of({ exitoso: true }));

            component.save();

            expect(mockNoObjecionRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    postulanteId: 5,
                    detalles: [expect.objectContaining({ itemMlId: 1, cantidad: 10, montoAdjudicado: 100, precioAdjudicado: 10 })]
                })
            );
            expect(mockAlert.toast).toHaveBeenCalledWith('No Objeción registrada exitosamente.');
        });

        it('should upload the selected file before submitting, and use the returned url', () => {
            component.noObjecionForm.patchValue({ tipoDocumento: 1, numeroDocumento: '12', fechaDocumento: '2026-08-01' });
            component.items.at(0).patchValue({ itemId: 1, cantidad: 10, montoAdjudicado: 100, rucProveedor: '12345678901', razonSocialProveedor: 'Prov' });
            const file = new File([new Uint8Array(10)], 'doc.pdf', { type: 'application/pdf' });
            component.selectedFile.set(file);
            mockFileStorage.uploadFile = jest.fn().mockReturnValue(of({ fileUrl: 'uploaded-url' }));
            mockNoObjecionRepo.create = jest.fn().mockReturnValue(of({ exitoso: true }));

            component.save();

            expect(mockFileStorage.uploadFile).toHaveBeenCalledWith(file, 'no-objeciones');
            expect(mockNoObjecionRepo.create).toHaveBeenCalledWith(expect.objectContaining({ archivoUrl: 'uploaded-url' }));
        });

        it('should surface an upload error without submitting the form', () => {
            component.noObjecionForm.patchValue({ tipoDocumento: 1, numeroDocumento: '12', fechaDocumento: '2026-08-01' });
            component.items.at(0).patchValue({ itemId: 1, cantidad: 10, montoAdjudicado: 100, rucProveedor: '12345678901', razonSocialProveedor: 'Prov' });
            component.selectedFile.set(new File([new Uint8Array(10)], 'doc.pdf', { type: 'application/pdf' }));
            mockFileStorage.uploadFile = jest.fn().mockReturnValue(throwError(() => new Error('upload failed')));

            component.save();

            expect(mockNoObjecionRepo.create).not.toHaveBeenCalled();
            expect(mockAlert.show).toHaveBeenCalledWith('Error', 'upload failed', 'error');
            expect(component.isSubmitting()).toBe(false);
        });

        it('should reject an invalid file without setting it as selected', () => {
            mockFileStorage.validateFile = jest.fn().mockReturnValue({ valid: false, error: 'Formato inválido.' });
            const event = { target: { files: [new File([], 'x.docx')] } };

            component.onFileSelected(event);

            expect(component.selectedFile()).toBeNull();
            expect(mockAlert.show).toHaveBeenCalledWith('Archivo inválido', 'Formato inválido.', 'error');
        });

        it('should populate item fields when an item is selected, from its saldo', () => {
            component.items.at(0).patchValue({ itemId: 1 });

            component.onItemChange(0);

            expect(component.items.at(0).get('itemNombre')?.value).toBe('Fertilizante');
            expect(component.items.at(0).get('cantidad')?.value).toBe(100);
            expect(component.items.at(0).get('montoAdjudicado')?.value).toBe(1000);
        });

        it('should compute montoAdjudicado proportionally to the entered cantidad', () => {
            component.items.at(0).patchValue({ itemId: 1, cantidad: 25 });

            component.onCantidadChange(0);

            expect(component.items.at(0).get('montoAdjudicado')?.value).toBe(250); // 25/100 * 1000
        });

        it('should sum montoAdjudicado across all item rows', () => {
            component.items.at(0).patchValue({ montoAdjudicado: 300 });
            component.addItem();
            component.items.at(1).patchValue({ montoAdjudicado: 200 });

            expect(component.calculateTotal()).toBe(500);
        });
    });

    describe('edit mode', () => {
        it('should parse the plain number out of a formatted numeroDocumento and preload the detalle rows', async () => {
            component.mode = 'edit';
            component.noObjecionId = 9;
            mockNoObjecionRepo.getById = jest.fn().mockReturnValue(
                of({
                    numeroDocumento: '0012-2026',
                    fechaDocumento: '2026-08-01T00:00:00',
                    tipoDocumentoId: 1,
                    observacion: '',
                    detalles: [{ itemMlId: 1, cantidad: 10, montoAdjudicado: 100, rucProveedor: '12345678901', razonSocialProveedor: 'Prov' }]
                })
            );

            // loadNoObjecionForEdit encadena un Promise (loadUnifiedItems().then(...)) que resuelve
            // en un microtask; hay que esperar a que el fixture se estabilice antes de aserciones.
            fixture.detectChanges();
            await fixture.whenStable();

            expect(component.noObjecionForm.get('numeroDocumento')?.value).toBe('12');
            expect(component.noObjecionForm.get('fechaDocumento')?.value).toBe('2026-08-01');
            expect(component.items.length).toBe(1);
            expect(component.items.at(0).get('itemNombre')?.value).toBe('Fertilizante');
        });
    });

    describe('view mode', () => {
        it('should disable the whole form', async () => {
            component.mode = 'view';
            component.noObjecionId = 9;
            mockNoObjecionRepo.getById = jest.fn().mockReturnValue(
                of({
                    numeroDocumento: '12',
                    fechaDocumento: '2026-08-01',
                    tipoDocumentoId: 1,
                    observacion: '',
                    detalles: [{ itemMlId: 1, cantidad: 10, montoAdjudicado: 100, rucProveedor: '12345678901', razonSocialProveedor: 'Prov' }]
                })
            );

            fixture.detectChanges();
            await fixture.whenStable();

            expect(component.noObjecionForm.disabled).toBe(true);
        });
    });
});

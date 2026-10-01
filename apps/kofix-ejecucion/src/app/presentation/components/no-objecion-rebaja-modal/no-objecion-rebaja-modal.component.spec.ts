import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AlertService } from '@agroideas/feedback';
import { NoObjecionRebajaModalComponent } from './no-objecion-rebaja-modal.component';
import { NoObjecionRepository } from '../../../domain/repositories/no-objecion.repository';
import { NoObjecionRebajaSaldo } from '../../../domain/models/no-objecion.model';

// ADR 0012 Fase 4. Ejemplo del owner: N.O. de 6,000 (6 meses a 1,000) con 2,000 solicitados.
describe('NoObjecionRebajaModalComponent', () => {
    let component: NoObjecionRebajaModalComponent;
    let fixture: ComponentFixture<NoObjecionRebajaModalComponent>;
    let mockRepo: jest.Mocked<Partial<NoObjecionRepository>>;
    let mockAlert: jest.Mocked<Partial<AlertService>>;

    const saldo = (overrides: Partial<NoObjecionRebajaSaldo> = {}): NoObjecionRebajaSaldo => ({
        id: 6,
        postulanteId: 190432,
        numeroDocumento: '0946',
        tipoDocumentoNombre: 'MEMORANDO',
        fechaDocumento: '2026-05-26T00:00:00',
        detalles: [{
            noObjecionDetId: 7, itemMlId: 172575, itemNombre: 'Asistencia técnica', proveedorNombre: 'Proveedor S.A.',
            montoAdjudicado: 6000, cantidad: 6, precioUnitario: 1000, montoRebajado: 0, montoVigente: 6000,
            montoSolicitado: 2000, montoDevuelto: 0, saldoNoSolicitado: 4000, unidadesRebajables: 4
        }],
        rebajas: [],
        ...overrides
    });

    const pdf = () => ({ target: { files: [new File(['x'], 'carta.pdf', { type: 'application/pdf' })] } }) as unknown as Event;

    const completarSustento = () => {
        component.numeroCarta.set('015-2026');
        component.fechaCarta.set('2026-10-01');
        component.motivo.set('El proveedor no continúa');
        component.onFileSelected(pdf());
    };

    beforeEach(async () => {
        mockRepo = {
            getSaldoRebaja: jest.fn().mockReturnValue(of(saldo())),
            uploadFile: jest.fn().mockReturnValue(of({ fileUrl: 'a1b2c3d4-0000-0000-0000-000000000000' })),
            registrarRebaja: jest.fn().mockReturnValue(of({ mensaje: 'Rebaja registrada con éxito.' }))
        };
        mockAlert = { show: jest.fn(), toast: jest.fn(), confirm: jest.fn().mockResolvedValue({ isConfirmed: true }) };

        await TestBed.configureTestingModule({
            imports: [NoObjecionRebajaModalComponent],
            providers: [
                { provide: NoObjecionRepository, useValue: mockRepo },
                { provide: AlertService, useValue: mockAlert }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(NoObjecionRebajaModalComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('noObjecionId', 6);
        fixture.detectChanges();
    });

    it('should load the saldo and preselect the first item with saldo', () => {
        expect(mockRepo.getSaldoRebaja).toHaveBeenCalledWith(6);
        expect(component.selectedDetId()).toBe(7);
        expect(component.minFechaCarta()).toBe('2026-05-26');
    });

    it('should compute the partial amount as unidades × precio unitario', () => {
        component.unidades.set(3);

        expect(component.montoRebaja()).toBe(3000);
    });

    it('should take the whole saldo no solicitado when anulando el saldo', () => {
        component.setModo('total');

        expect(component.montoRebaja()).toBe(4000);
        expect(component.unidades()).toBeNull();
    });

    it('should reject non-integer units or units above the maximum', () => {
        completarSustento();

        component.unidades.set(2.5);
        expect(component.canSave()).toBe(false);
        component.unidades.set(5);
        expect(component.canSave()).toBe(false);
        component.unidades.set(4);
        expect(component.canSave()).toBe(true);
    });

    it('should require the carta de la organización (N°, fecha, archivo) and motivo', () => {
        component.unidades.set(2);
        expect(component.canSave()).toBe(false);

        completarSustento();
        expect(component.canSave()).toBe(true);
    });

    it('should register a partial rebaja after confirmation and close with refresh', async () => {
        const closed = jest.fn();
        component.closed.subscribe(closed);
        component.unidades.set(4);
        completarSustento();

        component.save();
        await Promise.resolve();

        expect(mockAlert.confirm).toHaveBeenCalledWith('¿Registrar la rebaja?', expect.stringContaining('saldo disponible de la meta'));
        expect(mockRepo.registrarRebaja).toHaveBeenCalledWith(6, {
            noObjecionDetId: 7, total: false, unidades: 4, numeroCarta: '015-2026', fechaCarta: '2026-10-01',
            archivoUrl: 'a1b2c3d4-0000-0000-0000-000000000000', motivo: 'El proveedor no continúa'
        });
        expect(closed).toHaveBeenCalledWith(true);
    });

    it('should send total=true without unidades when anulando el saldo', async () => {
        component.setModo('total');
        completarSustento();

        component.save();
        await Promise.resolve();

        expect(mockRepo.registrarRebaja).toHaveBeenCalledWith(6, expect.objectContaining({ total: true, unidades: undefined }));
    });

    it('should not register when the confirmation is dismissed', async () => {
        mockAlert.confirm = jest.fn().mockResolvedValue({ isConfirmed: false });
        component.unidades.set(1);
        completarSustento();

        component.save();
        await Promise.resolve();

        expect(mockRepo.registrarRebaja).not.toHaveBeenCalled();
    });

    it('should show the API error message and keep the modal open', async () => {
        mockRepo.registrarRebaja = jest.fn().mockReturnValue(throwError(() => ({ error: { mensaje: 'Máximo rebajable: 3 unidad(es).' } })));
        const closed = jest.fn();
        component.closed.subscribe(closed);
        component.unidades.set(4);
        completarSustento();

        component.save();
        await Promise.resolve();

        expect(mockAlert.show).toHaveBeenCalledWith('Error', 'Máximo rebajable: 3 unidad(es).', 'error');
        expect(closed).not.toHaveBeenCalled();
    });

    it('should reject non-PDF files', () => {
        component.onFileSelected({ target: { files: [new File(['x'], 'carta.docx', { type: 'application/msword' })] } } as unknown as Event);

        expect(mockRepo.uploadFile).not.toHaveBeenCalled();
        expect(component.fileUrl()).toBeNull();
    });

    it('should show the empty state when no item has saldo', () => {
        mockRepo.getSaldoRebaja = jest.fn().mockReturnValue(of(saldo({ detalles: [{ ...saldo().detalles[0], saldoNoSolicitado: 0, unidadesRebajables: 0 }] })));
        fixture = TestBed.createComponent(NoObjecionRebajaModalComponent);
        fixture.componentRef.setInput('noObjecionId', 6);
        fixture.detectChanges();

        expect(fixture.componentInstance.selectedDetId()).toBeNull();
        expect(fixture.nativeElement.querySelector('[data-testid="sin-saldo"]')).toBeTruthy();
    });
});

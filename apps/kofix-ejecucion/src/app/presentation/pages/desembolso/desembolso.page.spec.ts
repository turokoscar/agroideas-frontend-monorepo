import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AlertService } from '@agroideas/feedback';
import { PermissionService } from '@agroideas/security';
import { DesembolsoPageComponent } from './desembolso.page';
import { DesembolsoRepository } from '../../../domain/repositories/desembolso.repository';
import { CatalogoRepository } from '../../../domain/repositories/catalogo.repository';
import { Desembolso, DesembolsoChequePendiente } from '../../../domain/models/desembolso.model';

describe('DesembolsoPageComponent', () => {
    let component: DesembolsoPageComponent;
    let fixture: ComponentFixture<DesembolsoPageComponent>;
    let mockDesembolsoRepo: jest.Mocked<Partial<DesembolsoRepository>>;
    let mockCatalogoRepo: jest.Mocked<Partial<CatalogoRepository>>;
    let mockAlert: jest.Mocked<Partial<AlertService>>;
    let mockPermissionService: jest.Mocked<Partial<PermissionService>>;

    const buildDesembolso = (overrides: Partial<Desembolso> = {}): Desembolso => ({
        id: 1,
        fechaSolicitud: '2026-08-01',
        estadoId: 1,
        estadoNombre: 'PENDIENTE',
        tipoPagoNombre: 'TRANSFERENCIA',
        montoTotalDesembolsado: 500,
        montoRendido: 0,
        numeroNoObjecion: '0001-2026',
        numeroSolicitud: '12',
        ...overrides
    });

    beforeEach(async () => {
        mockDesembolsoRepo = {
            getByPostulante: jest.fn().mockReturnValue(of({ items: [], total: 0 })),
            getChequesPendientesActivacion: jest.fn().mockReturnValue(of([])),
            anular: jest.fn()
        };
        mockCatalogoRepo = { getByGrupo: jest.fn().mockReturnValue(of([])) };
        mockAlert = { confirm: jest.fn(), show: jest.fn(), toast: jest.fn() };
        mockPermissionService = { hasPermission: jest.fn().mockReturnValue(false) };

        await TestBed.configureTestingModule({
            imports: [DesembolsoPageComponent],
            providers: [
                { provide: DesembolsoRepository, useValue: mockDesembolsoRepo },
                { provide: CatalogoRepository, useValue: mockCatalogoRepo },
                { provide: AlertService, useValue: mockAlert },
                { provide: PermissionService, useValue: mockPermissionService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(DesembolsoPageComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('convenioId', 5);
    });

    it('should load the TIPO_PAGO catalog and the desembolsos for the convenio on init', () => {
        fixture.detectChanges();

        expect(mockCatalogoRepo.getByGrupo).toHaveBeenCalledWith('TIPO_PAGO');
        expect(mockDesembolsoRepo.getByPostulante).toHaveBeenCalledWith(5, undefined, undefined, undefined, undefined, 0, 10);
    });

    it('should not query when convenioId resolves to 0', () => {
        fixture.componentRef.setInput('convenioId', 0);
        fixture.detectChanges();

        expect(mockDesembolsoRepo.getByPostulante).not.toHaveBeenCalled();
    });

    it('should reflect the ACTIVAR_CHEQUES permission and load the bandeja when granted', () => {
        mockPermissionService.hasPermission = jest.fn().mockReturnValue(true);
        fixture.detectChanges();

        expect((component as unknown as { puedeActivarCheque: () => boolean }).puedeActivarCheque()).toBe(true);
        expect(mockDesembolsoRepo.getChequesPendientesActivacion).toHaveBeenCalledWith(5);
    });

    it('should not load the bandeja de cheques when the user lacks ACTIVAR_CHEQUES', () => {
        fixture.detectChanges();

        expect(mockDesembolsoRepo.getChequesPendientesActivacion).not.toHaveBeenCalled();
    });

    it('should format the numeroSolicitud padded to 4 digits plus the year of fechaSolicitud', () => {
        expect(component.formatSolicitudNumber({ numeroSolicitud: '55', fechaSolicitud: '2026-03-10' } as Desembolso)).toBe('0055-2026');
    });

    it('should show a dash when numeroSolicitud is missing', () => {
        expect(component.formatSolicitudNumber({ fechaSolicitud: '2026-03-10' } as Desembolso)).toBe('-');
    });

    it('should map estado codes to their badge status, defaulting unknown ones to Pendiente', () => {
        expect(component.getBadgeStatus('APROBADO')).toBe('Aprobado');
        expect(component.getBadgeStatus('EN_PROCESO')).toBe('Pendiente');
        expect(component.getBadgeStatus('DESCONOCIDO')).toBe('Pendiente');
    });

    it('should mark a desembolso as Pendiente de Rendir when nothing has been rendered yet', () => {
        expect(component.getEstadoRendicion({ montoTotalDesembolsado: 1000, montoRendido: 0 } as Desembolso))
            .toEqual({ status: 'Pendiente', text: 'Pendiente de Rendir' });
    });

    it('should mark a desembolso as Rendido Parcial when only part of the amount was rendered', () => {
        expect(component.getEstadoRendicion({ montoTotalDesembolsado: 1000, montoRendido: 400 } as Desembolso))
            .toEqual({ status: 'Media', text: 'Rendido Parcial' });
    });

    it('should mark a desembolso as Rendido when the full amount was rendered', () => {
        expect(component.getEstadoRendicion({ montoTotalDesembolsado: 1000, montoRendido: 1000 } as Desembolso))
            .toEqual({ status: 'Aprobado', text: 'Rendido' });
    });

    const buildChequePendiente = (overrides: Partial<DesembolsoChequePendiente> = {}): DesembolsoChequePendiente => ({
        id: 1,
        ideCheque: 1,
        correlativo: 'CH-2202-0001',
        postulanteId: 5,
        numeroSolicitud: 'SD-001',
        monto: 500,
        fechaDevengado: '2026-08-26',
        ...overrides
    });

    describe('abrirActivarChequeModal', () => {
        it('should show the activar-cheque modal with the selected cheque', () => {
            fixture.detectChanges();
            const cheque = buildChequePendiente();

            component.abrirActivarChequeModal(cheque);

            expect(component.showActivarChequeModal()).toBe(true);
            expect(component.activandoCheque()).toBe(cheque);
        });
    });

    describe('handleActivarChequeModalClose', () => {
        it('should reload both the bandeja and the main list when confirmed', () => {
            fixture.detectChanges();
            component.showActivarChequeModal.set(true);
            jest.clearAllMocks();

            component.handleActivarChequeModalClose(true);

            expect(component.showActivarChequeModal()).toBe(false);
            expect(mockDesembolsoRepo.getChequesPendientesActivacion).toHaveBeenCalledWith(5);
            expect(mockDesembolsoRepo.getByPostulante).toHaveBeenCalled();
        });

        it('should not reload when closed without confirming', () => {
            fixture.detectChanges();
            jest.clearAllMocks();

            component.handleActivarChequeModalClose(false);

            expect(mockDesembolsoRepo.getChequesPendientesActivacion).not.toHaveBeenCalled();
            expect(mockDesembolsoRepo.getByPostulante).not.toHaveBeenCalled();
        });
    });

    it('should reload the list when the modal closes requesting a refresh', () => {
        fixture.detectChanges();
        component.showModal.set(true);
        jest.clearAllMocks();

        component.handleModalClose(true);

        expect(component.showModal()).toBe(false);
        expect(mockDesembolsoRepo.getByPostulante).toHaveBeenCalled();
    });

    it('should not reload when the modal closes without requesting a refresh', () => {
        fixture.detectChanges();
        jest.clearAllMocks();

        component.handleModalClose(false);

        expect(mockDesembolsoRepo.getByPostulante).not.toHaveBeenCalled();
    });

    describe('openCreateModal', () => {
        it('should show the modal in create mode without a preloaded desembolso', () => {
            fixture.detectChanges();
            component.editingDesembolso.set(buildDesembolso());
            component.modalMode.set('edit');

            component.openCreateModal();

            expect(component.showModal()).toBe(true);
            expect(component.modalMode()).toBe('create');
            expect(component.editingDesembolso()).toBeUndefined();
        });
    });

    describe('editDesembolso', () => {
        it('should block editing a desembolso that already has a rendición', () => {
            fixture.detectChanges();

            component.editDesembolso(buildDesembolso({ montoRendido: 100 }));

            expect(component.showModal()).toBe(false);
            expect(mockAlert.show).toHaveBeenCalledWith('Acción no permitida', expect.any(String), 'warning');
        });

        it('should open the edit modal when there is no rendición', () => {
            fixture.detectChanges();
            const row = buildDesembolso({ montoRendido: 0 });

            component.editDesembolso(row);

            expect(component.showModal()).toBe(true);
            expect(component.modalMode()).toBe('edit');
            expect(component.editingDesembolso()).toBe(row);
        });
    });

    describe('deleteDesembolso', () => {
        it('should block anular when the desembolso already has a rendición', () => {
            fixture.detectChanges();

            component.deleteDesembolso(buildDesembolso({ montoRendido: 100 }));

            expect(mockAlert.confirm).not.toHaveBeenCalled();
            expect(mockAlert.show).toHaveBeenCalledWith('Acción no permitida', expect.any(String), 'warning');
        });

        it('should not anular when the confirmation is dismissed', async () => {
            mockAlert.confirm = jest.fn().mockResolvedValue({ isConfirmed: false });

            component.deleteDesembolso(buildDesembolso({ montoRendido: 0 }));
            await Promise.resolve();

            expect(mockDesembolsoRepo.anular).not.toHaveBeenCalled();
        });

        it('should anular and reload the list when confirmed', async () => {
            fixture.detectChanges();
            jest.clearAllMocks();
            mockAlert.confirm = jest.fn().mockResolvedValue({ isConfirmed: true });
            mockDesembolsoRepo.anular = jest.fn().mockReturnValue(of(null));

            component.deleteDesembolso(buildDesembolso({ id: 9, montoRendido: 0 }));
            await Promise.resolve();

            expect(mockDesembolsoRepo.anular).toHaveBeenCalledWith(9);
            expect(mockAlert.toast).toHaveBeenCalledWith('Solicitud anulada con éxito.');
            expect(mockDesembolsoRepo.getByPostulante).toHaveBeenCalled();
        });
    });

    describe('viewDesembolso', () => {
        it('should open the lightweight items modal with the selected row', () => {
            fixture.detectChanges();
            const row = buildDesembolso();

            component.viewDesembolso(row);

            expect(component.showItemsModal()).toBe(true);
            expect(component.viewingDesembolso()).toBe(row);
            expect(component.showModal()).toBe(false);
        });

        it('should close the items modal without reloading the list', () => {
            fixture.detectChanges();
            component.viewDesembolso(buildDesembolso());
            jest.clearAllMocks();

            component.handleItemsModalClose();

            expect(component.showItemsModal()).toBe(false);
            expect(mockDesembolsoRepo.getByPostulante).not.toHaveBeenCalled();
        });
    });
});

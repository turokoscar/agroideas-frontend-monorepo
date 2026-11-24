import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AlertService } from '@agroideas/feedback';
import { PermissionService } from '@agroideas/security';
import { NoObjecionPageComponent } from './no-objecion.page';
import { EvaluacionNoObjecionRepository } from '../../../domain/repositories/evaluacion-no-objecion.repository';
import { NoObjecionRepository } from '../../../domain/repositories/no-objecion.repository';
import { NoObjecion } from '../../../domain/models/no-objecion.model';

describe('NoObjecionPageComponent', () => {
    let component: NoObjecionPageComponent;
    let fixture: ComponentFixture<NoObjecionPageComponent>;
    let mockRepo: jest.Mocked<Partial<NoObjecionRepository>>;
    let mockAlert: jest.Mocked<Partial<AlertService>>;
    let mockPermissionService: jest.Mocked<Partial<PermissionService>>;

    const buildNoObjecion = (overrides: Partial<NoObjecion> = {}): NoObjecion => ({
        id: 1,
        tipoDocumentoId: 1,
        numeroDocumento: '12',
        fechaDocumento: '2026-06-01',
        postulanteId: 5,
        detalles: [],
        numSolicitudes: 0,
        estadoAprobacion: 'PENDIENTE',
        ...overrides
    });

    beforeEach(async () => {
        mockRepo = {
            getByPostulante: jest.fn().mockReturnValue(of({ items: [], total: 0 })),
            downloadFile: jest.fn()
        };
        mockAlert = { show: jest.fn(), toast: jest.fn(), confirm: jest.fn() };
        mockPermissionService = { hasPermission: jest.fn().mockReturnValue(true) };

        await TestBed.configureTestingModule({
            imports: [NoObjecionPageComponent],
            providers: [
                { provide: NoObjecionRepository, useValue: mockRepo },
                { provide: EvaluacionNoObjecionRepository, useValue: { getByPostulante: () => of([]) } },
                { provide: AlertService, useValue: mockAlert },
                { provide: PermissionService, useValue: mockPermissionService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(NoObjecionPageComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('convenioId', 5);
    });

    it('should load the no-objeciones for the convenio on init', () => {
        fixture.detectChanges();

        expect(mockRepo.getByPostulante).toHaveBeenCalledWith(5, 0, 10, '', '', '');
    });

    it('should not query when convenioId resolves to 0', () => {
        fixture.componentRef.setInput('convenioId', 0);
        fixture.detectChanges();

        expect(mockRepo.getByPostulante).not.toHaveBeenCalled();
    });

    describe('formatDocNumber', () => {
        it('should pad a bare number and append the year', () => {
            expect(component.formatDocNumber('7', '2025-06-01')).toBe('0007-2025');
        });

        it('should pass through a number with a dash unchanged', () => {
            expect(component.formatDocNumber('0007-2025', null)).toBe('0007-2025');
        });
    });

    describe('evaluación (API ADR-032)', () => {
        it('should link a no-objecion to its evaluation and leave the earlier ones without it', () => {
            component.evaluaciones.set([{ id: 7, noObjecionId: 1, estado: 'PENDIENTE', fechaCreacion: '', numItems: 1 }]);

            expect(component.evaluacionDe(buildNoObjecion({ id: 1 }))).toBe(7);
            expect(component.evaluacionDe(buildNoObjecion({ id: 2 }))).toBeNull();
        });

        it('should not offer to register, edit or delete a no-objecion directly', () => {
            mockRepo.getByPostulante = jest.fn().mockReturnValue(of({ items: [buildNoObjecion({ id: 6 })], total: 1 }));
            fixture.detectChanges();

            expect(fixture.nativeElement.querySelector('[aria-label="Editar"], [aria-label="Eliminar"]')).toBeNull();
            expect(fixture.nativeElement.textContent).not.toContain('Nueva No Objeción');
        });

        it('should only allow rebajas on an approved no-objecion with balance', () => {
            expect(component.puedeRebajar(buildNoObjecion({ saldoMonto: 100 }))).toBe(false);
            expect(component.puedeRebajar(buildNoObjecion({ saldoMonto: 100, estadoAprobacion: 'APROBADO' }))).toBe(true);
        });
    });

    describe('viewNoObjecion', () => {
        it('should open the lightweight items modal ', () => {
            fixture.detectChanges();

            component.viewNoObjecion(1);

            expect(component.showItemsModal()).toBe(true);
            expect(component.viewingNoObjecionId()).toBe(1);
        });

        it('should close the items modal without reloading the list', () => {
            fixture.detectChanges();
            component.viewNoObjecion(1);
            jest.clearAllMocks();

            component.handleItemsModalClose();

            expect(component.showItemsModal()).toBe(false);
            expect(mockRepo.getByPostulante).not.toHaveBeenCalled();
        });
    });

    it('should warn instead of downloading when there is no file url', () => {
        component.downloadDocument('');

        expect(mockRepo.downloadFile).not.toHaveBeenCalled();
        expect(mockAlert.show).toHaveBeenCalledWith('Información', expect.any(String), 'info');
    });

    // ADR 0012 Fase 4: rebaja / anulación del saldo no solicitado
    describe('rebaja', () => {
        it('should only allow rebajar when there is saldo no solicitado', () => {
            expect(component.puedeRebajar(buildNoObjecion({ estadoAprobacion: 'APROBADO', saldoMonto: 4000 }))).toBe(true);
            expect(component.puedeRebajar(buildNoObjecion({ estadoAprobacion: 'APROBADO', saldoMonto: 0 }))).toBe(false);
            expect(mockPermissionService.hasPermission).toHaveBeenCalledWith('OPERACIONES_FINANCIERAS');
        });

        it('should hide the rebaja button without OPERACIONES_FINANCIERAS, even with saldo', () => {
            mockPermissionService.hasPermission = jest.fn().mockReturnValue(false);
            mockRepo.getByPostulante = jest.fn().mockReturnValue(of({ items: [buildNoObjecion({ id: 6, estadoAprobacion: 'APROBADO', saldoMonto: 4000 })], total: 1 }));
            fixture = TestBed.createComponent(NoObjecionPageComponent);
            component = fixture.componentInstance;
            fixture.componentRef.setInput('convenioId', 5);
            fixture.detectChanges();

            expect(component.puedeRebajar(buildNoObjecion({ estadoAprobacion: 'APROBADO', saldoMonto: 4000 }))).toBe(false);
            expect(fixture.nativeElement.querySelector('[aria-label="Rebajar / Anular saldo"]')).toBeNull();
            component.openRebajaModal(buildNoObjecion({ id: 6, estadoAprobacion: 'APROBADO', saldoMonto: 4000 }));
            expect(component.showRebajaModal()).toBe(false);
        });

        it('should render the rebaja button only for rows with saldo when the user has the permission', () => {
            mockRepo.getByPostulante = jest.fn().mockReturnValue(of({
                items: [buildNoObjecion({ id: 6, estadoAprobacion: 'APROBADO', saldoMonto: 4000 }), buildNoObjecion({ id: 7, estadoAprobacion: 'APROBADO', saldoMonto: 0 })],
                total: 2
            }));
            fixture.detectChanges();

            expect(fixture.nativeElement.querySelectorAll('[aria-label="Rebajar / Anular saldo"]').length).toBe(1);
        });

        it('should open the rebaja modal for the selected row', () => {
            component.openRebajaModal(buildNoObjecion({ id: 6, estadoAprobacion: 'APROBADO', saldoMonto: 4000 }));

            expect(component.showRebajaModal()).toBe(true);
            expect(component.rebajaNoObjecionId()).toBe(6);
        });

        it('should not open the rebaja modal without saldo', () => {
            component.openRebajaModal(buildNoObjecion({ id: 6, estadoAprobacion: 'APROBADO', saldoMonto: 0 }));

            expect(component.showRebajaModal()).toBe(false);
        });

        it('should reload the list only when the rebaja was registered', () => {
            fixture.detectChanges();
            jest.clearAllMocks();

            component.handleRebajaModalClose(false);
            expect(mockRepo.getByPostulante).not.toHaveBeenCalled();

            component.handleRebajaModalClose(true);
            expect(mockRepo.getByPostulante).toHaveBeenCalled();
        });


        it('should map the API estados to status pills', () => {
            expect(component.getBadgeStatus('Rebajada')).toBe('Media');
            expect(component.getBadgeStatus('Cerrada')).toBe('Cerrado');
            expect(component.getBadgeStatus('En Uso')).toBe('Activo');
        });
    });
});

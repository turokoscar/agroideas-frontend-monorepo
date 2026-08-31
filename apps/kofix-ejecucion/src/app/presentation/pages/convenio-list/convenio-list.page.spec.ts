import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { AlertService } from '@agroideas/feedback';
import { PermissionService } from '@agroideas/security';
import { ConvenioListPageComponent } from './convenio-list.page';
import { ConvenioRepository } from '../../../domain/repositories/convenio.repository';
import { CarteraRepository } from '../../../domain/repositories/cartera.repository';
import { Convenio } from '../../../domain/models/convenio.model';

describe('ConvenioListPageComponent', () => {
    let component: ConvenioListPageComponent;
    let fixture: ComponentFixture<ConvenioListPageComponent>;
    let mockConvenioRepo: jest.Mocked<Partial<ConvenioRepository>>;
    let mockCarteraRepo: jest.Mocked<Partial<CarteraRepository>>;
    let mockPermissionService: jest.Mocked<Partial<PermissionService>>;
    let mockAlert: jest.Mocked<Partial<AlertService>>;
    let router: Router;

    const buildConvenio = (overrides: Partial<Convenio> = {}): Convenio => ({
        id: 1,
        numeroConvenio: '12',
        ruc: '20100000001',
        razonSocial: 'Asociación',
        region: 'Cusco',
        estado: 'VIGENTE',
        fechaInicio: '2026-03-01',
        fechaFin: '2026-12-31',
        montoAprobado: 1000,
        montoProgramado: 500,
        montoEjecutado: 400,
        saldoPorProgramar: 500,
        saldoPorEjecutar: 600,
        programacionAcumulada: 500,
        ejecucionAcumulada: 400,
        saldoDisponible: 600,
        asignadoA: 'Juan Pérez',
        email: 'juan@test.com',
        periodo: 2026,
        duracion: 12,
        ...overrides
    });

    beforeEach(async () => {
        mockConvenioRepo = {
            getTodos: jest.fn().mockReturnValue(of({ datos: [], total: 0 })),
            getAsignados: jest.fn().mockReturnValue(of({ datos: [], total: 0 }))
        };
        mockCarteraRepo = {
            getUbigeos: jest.fn().mockReturnValue(of([]))
        };
        mockPermissionService = { hasPermission: jest.fn().mockReturnValue(false) };
        mockAlert = { show: jest.fn() };

        await TestBed.configureTestingModule({
            imports: [ConvenioListPageComponent],
            providers: [
                provideRouter([]),
                { provide: ConvenioRepository, useValue: mockConvenioRepo },
                { provide: CarteraRepository, useValue: mockCarteraRepo },
                { provide: PermissionService, useValue: mockPermissionService },
                { provide: AlertService, useValue: mockAlert }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ConvenioListPageComponent);
        component = fixture.componentInstance;
        router = TestBed.inject(Router);
        jest.spyOn(router, 'navigate').mockResolvedValue(true);
    });

    const filtrosVacios = { periodo: undefined, estado: undefined };

    it('should use getAsignados by default (no VER_TODOS_CONVENIOS permission)', () => {
        fixture.detectChanges();

        expect(mockConvenioRepo.getAsignados).toHaveBeenCalledWith(1, 10, '', filtrosVacios);
        expect(mockConvenioRepo.getTodos).not.toHaveBeenCalled();
    });

    it('should use getTodos when the user has VER_TODOS_CONVENIOS', () => {
        mockPermissionService.hasPermission = jest.fn().mockReturnValue(true);

        fixture.detectChanges();

        expect(mockConvenioRepo.getTodos).toHaveBeenCalledWith(1, 10, '', filtrosVacios);
    });

    it('should send estado to the repository as a real server-side filter (ADR-022), not filter in memory', () => {
        fixture.detectChanges();

        component.onEstadoFiltroChange('ACTIVO');

        expect(mockConvenioRepo.getAsignados).toHaveBeenLastCalledWith(1, 10, '', { periodo: undefined, estado: 'ACTIVO' });
    });

    it('should merge the ubigeo filter into the next request and reset to page 1', () => {
        fixture.detectChanges();

        component.onUbigeoFiltroChange({ departamentoCodigo: '08', provinciaCodigo: '0801' });

        expect(mockConvenioRepo.getAsignados).toHaveBeenLastCalledWith(1, 10, '', {
            departamentoCodigo: '08',
            provinciaCodigo: '0801',
            periodo: undefined,
            estado: undefined
        });
    });

    it('should merge the periodo filter into the next request', () => {
        fixture.detectChanges();

        component.onPeriodoFiltroChange('2024');

        expect(mockConvenioRepo.getAsignados).toHaveBeenLastCalledWith(1, 10, '', { periodo: 2024, estado: undefined });

        component.onPeriodoFiltroChange('');

        expect(mockConvenioRepo.getAsignados).toHaveBeenLastCalledWith(1, 10, '', { periodo: undefined, estado: undefined });
    });

    describe('formatConvenioNumber', () => {
        it('should show a dash when there is no numeroConvenio', () => {
            expect(component.formatConvenioNumber(buildConvenio({ numeroConvenio: '' }))).toBe('-');
        });

        it('should pass through a number that already carries the -ST suffix', () => {
            expect(component.formatConvenioNumber(buildConvenio({ numeroConvenio: '0012-2026-ST' }))).toBe('0012-2026-ST');
        });

        it('should pad and append year + ST suffix otherwise', () => {
            expect(component.formatConvenioNumber(buildConvenio({ numeroConvenio: '12', fechaInicio: '2025-06-01' }))).toBe('0012-2025-ST');
        });
    });

    it('should compute the saldo, preferring saldoPorEjecutar', () => {
        expect(component.getSaldo(buildConvenio({ saldoPorEjecutar: 300 }))).toBe(300);
        expect(component.getSaldo(buildConvenio({ saldoPorEjecutar: undefined as any, montoAprobado: 1000, montoEjecutado: 700 }))).toBe(300);
    });

    it('should classify riesgo by remaining balance percentage', () => {
        expect(component.getRiesgo(buildConvenio({ saldoPorEjecutar: 600, montoAprobado: 1000 }))).toBe('success');
        expect(component.getRiesgo(buildConvenio({ saldoPorEjecutar: 200, montoAprobado: 1000 }))).toBe('warning');
        expect(component.getRiesgo(buildConvenio({ saldoPorEjecutar: 50, montoAprobado: 1000 }))).toBe('danger');
    });

    it('should compute the execution percentage, guarding against a missing montoAprobado', () => {
        expect(component.getPorcentajeEjecucion(buildConvenio({ montoAprobado: 1000, montoEjecutado: 250 }))).toBe(25);
        expect(component.getPorcentajeEjecucion(buildConvenio({ montoAprobado: 0, montoEjecutado: 250 }))).toBe(0);
    });

    it('should update pageSize when the table selector changes rows (ADR-019 Fase 3.5)', () => {
        component.onRowsChange(50);

        expect(component.pageSize()).toBe(50);
    });

    it('should navigate to the convenio detail', () => {
        component.goToDetail(3);
        expect(router.navigate).toHaveBeenCalledWith(['/main/convenios', 3]);
    });

    describe('continuar (ADR-019 Fase 3)', () => {
        it('should navigate to ejecucion when programacion is already complete', () => {
            component.continuar(buildConvenio({ id: 7, programacionAcumulada: 1000, montoAprobado: 1000 }));

            expect(router.navigate).toHaveBeenCalledWith(['/main/ejecucion', 7]);
        });

        it('should navigate to programacion-vigente when programacion is still incomplete', () => {
            component.continuar(buildConvenio({ id: 7, programacionAcumulada: 400, montoAprobado: 1000 }));

            expect(router.navigate).toHaveBeenCalledWith(['/main/programacion-vigente', 7]);
        });

        it('should reflect the target stage in the label/icon', () => {
            const completo = buildConvenio({ programacionAcumulada: 1000, montoAprobado: 1000 });
            const incompleto = buildConvenio({ programacionAcumulada: 400, montoAprobado: 1000 });

            expect(component.continuarLabel(completo)).toBe('Ir a Ejecución');
            expect(component.continuarIcon(completo)).toBe('account_balance_wallet');
            expect(component.continuarLabel(incompleto)).toBe('Continuar Programación');
            expect(component.continuarIcon(incompleto)).toBe('calendar_month');
        });

        it('should treat a missing montoAprobado as programacion incompleta', () => {
            expect(component.isProgramacionCompleta(buildConvenio({ montoAprobado: 0 }))).toBe(false);
        });
    });

    it('should map estado codes to status type, label, and semaphore class, defaulting unknown ones', () => {
        expect(component.getStatusType('VIGENTE')).toBe('Activo');
        expect(component.getStatusType('X')).toBe('Finalizado');
        expect(component.getStatusLabel('SUSPENDIDO')).toBe('Suspendido');
        expect(component.getSemaphoreClass('VIGENTE')).toBe('semaforo--green');
        expect(component.getSemaphoreClass('X')).toBe('semaforo--gray');
    });
});

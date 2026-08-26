import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { AlertService } from '@agroideas/feedback';
import { ConvenioDetailPageComponent } from './convenio-detail.page';
import { ConvenioStateService } from '../../../shared/services/convenio-state.service';
import { GetConvenioByIdUseCase } from '../../../domain/usecases/get-convenio-by-id.usecase';
import { Convenio } from '../../../domain/models/convenio.model';

describe('ConvenioDetailPageComponent', () => {
    let component: ConvenioDetailPageComponent;
    let fixture: ComponentFixture<ConvenioDetailPageComponent>;
    let mockUseCase: jest.Mocked<Partial<GetConvenioByIdUseCase>>;
    let mockAlert: jest.Mocked<Partial<AlertService>>;
    let mockRouter: { navigate: jest.Mock };

    const buildConvenio = (overrides: Partial<Convenio> = {}): Convenio => ({
        id: 5,
        numeroConvenio: '12',
        ruc: '20100000001',
        razonSocial: 'Asociación',
        region: 'Cusco',
        estado: 'VIGENTE',
        fechaInicio: '2026-06-01',
        fechaFin: '2026-12-31',
        montoAprobado: 1000,
        montoProgramado: 1000,
        montoEjecutado: 400,
        saldoPorProgramar: 0,
        saldoPorEjecutar: 600,
        programacionAcumulada: 1000, // 100% programado
        ejecucionAcumulada: 400,
        saldoDisponible: 600,
        asignadoA: 'Juan Pérez',
        email: 'juan@test.com',
        periodo: 2026,
        duracion: 12,
        ...overrides
    });

    const createComponent = (routeId: string | null = '5') => {
        mockRouter = { navigate: jest.fn() };

        TestBed.configureTestingModule({
            imports: [ConvenioDetailPageComponent],
            providers: [
                { provide: GetConvenioByIdUseCase, useValue: mockUseCase },
                { provide: AlertService, useValue: mockAlert },
                { provide: Router, useValue: mockRouter },
                {
                    provide: ActivatedRoute,
                    useValue: { snapshot: { paramMap: convertToParamMap(routeId ? { id: routeId } : {}) } }
                }
            ]
        });

        fixture = TestBed.createComponent(ConvenioDetailPageComponent);
        component = fixture.componentInstance;
        return fixture;
    };

    beforeEach(() => {
        mockUseCase = { execute: jest.fn().mockReturnValue(of(buildConvenio())) };
        mockAlert = { show: jest.fn() };
    });

    it('should load the convenio for the route id on init', () => {
        createComponent('5').detectChanges();

        expect(mockUseCase.execute).toHaveBeenCalledWith(5);
        expect(component.stateService.convenio()?.id).toBe(5);
    });

    it('should not attempt to load without a route id', () => {
        createComponent(null).detectChanges();

        expect(mockUseCase.execute).not.toHaveBeenCalled();
    });

    describe('continuar (ADR-019 Fase 3)', () => {
        it('should navigate to ejecucion when programacion is already complete', () => {
            mockUseCase = { execute: jest.fn().mockReturnValue(of(buildConvenio({ programacionAcumulada: 1000, montoAprobado: 1000 }))) };
            createComponent('5').detectChanges();

            component.continuar();

            expect(mockRouter.navigate).toHaveBeenCalledWith(['/main/ejecucion', 5]);
        });

        it('should navigate to programacion-vigente when programacion is still incomplete', () => {
            mockUseCase = { execute: jest.fn().mockReturnValue(of(buildConvenio({ programacionAcumulada: 200, montoAprobado: 1000 }))) };
            createComponent('5').detectChanges();

            component.continuar();

            expect(mockRouter.navigate).toHaveBeenCalledWith(['/main/programacion-vigente', 5]);
        });

        it('should reflect the target stage in the button label/icon', () => {
            mockUseCase = { execute: jest.fn().mockReturnValue(of(buildConvenio({ programacionAcumulada: 1000, montoAprobado: 1000 }))) };
            createComponent('5').detectChanges();

            expect(component.continuarLabel()).toBe('Ir a Ejecución');
            expect(component.continuarIcon()).toBe('account_balance_wallet');
        });

        it('should do nothing when there is no convenio loaded yet', () => {
            createComponent(null).detectChanges();

            component.continuar();

            expect(mockRouter.navigate).not.toHaveBeenCalled();
        });
    });

    it('should navigate back to the convenio list', () => {
        createComponent('5');
        component.goBack();

        expect(mockRouter.navigate).toHaveBeenCalledWith(['/main/convenios']);
    });

    it('should show an informational alert when downloading the physical convenio', () => {
        createComponent('5').detectChanges();

        component.downloadConvenioFisico();

        expect(mockAlert.show).toHaveBeenCalledWith('Descarga de Convenio', expect.stringContaining('próximamente'), 'info');
    });

    describe('formatConvenioNumber', () => {
        it('should show a dash without a convenio', () => {
            createComponent('5');
            expect(component.formatConvenioNumber(undefined)).toBe('-');
        });

        it('should pass through a number that already has the -ST suffix', () => {
            createComponent('5');
            expect(component.formatConvenioNumber(buildConvenio({ numeroConvenio: '0012-2026-ST' }))).toBe('0012-2026-ST');
        });

        it('should pad and append year + ST suffix otherwise', () => {
            createComponent('5');
            expect(component.formatConvenioNumber(buildConvenio({ numeroConvenio: '12', fechaInicio: '2026-06-01' }))).toBe('0012-2026-ST');
        });
    });

    it('should format currency, defaulting missing values to a dash', () => {
        createComponent('5');
        expect(component.formatCurrency(undefined)).toBe('-');
        expect(component.formatCurrency(1000)).toContain('1,000');
    });
});

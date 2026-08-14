import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { AlertService } from '@agroideas/feedback';
import { ConvenioDetailPageComponent } from './convenio-detail.page';
import { ConvenioStateService } from '../../../shared/services/convenio-state.service';
import { GetConvenioByIdUseCase } from '../../../domain/usecases/get-convenio-by-id.usecase';
import { KardexRepository } from '../../../domain/repositories/kardex.repository';
import { Convenio } from '../../../domain/models/convenio.model';

describe('ConvenioDetailPageComponent', () => {
    let component: ConvenioDetailPageComponent;
    let fixture: ComponentFixture<ConvenioDetailPageComponent>;
    let mockUseCase: jest.Mocked<Partial<GetConvenioByIdUseCase>>;
    let mockKardexRepo: jest.Mocked<Partial<KardexRepository>>;
    let mockAlert: jest.Mocked<Partial<AlertService>>;
    let queryParamMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

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
        queryParamMap$ = new BehaviorSubject(convertToParamMap({}));

        TestBed.configureTestingModule({
            imports: [ConvenioDetailPageComponent],
            providers: [
                { provide: GetConvenioByIdUseCase, useValue: mockUseCase },
                { provide: KardexRepository, useValue: mockKardexRepo },
                { provide: AlertService, useValue: mockAlert },
                { provide: Router, useValue: { navigate: jest.fn() } },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: { paramMap: convertToParamMap(routeId ? { id: routeId } : {}), queryParamMap: convertToParamMap({}) },
                        queryParamMap: queryParamMap$.asObservable()
                    }
                }
            ]
        });

        fixture = TestBed.createComponent(ConvenioDetailPageComponent);
        component = fixture.componentInstance;
        return fixture;
    };

    beforeEach(() => {
        mockUseCase = { execute: jest.fn().mockReturnValue(of(buildConvenio())) };
        mockKardexRepo = { getConsolidado: jest.fn().mockReturnValue(of([])) };
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

    it('should switch to the requested tab once it arrives via query params', () => {
        createComponent('5').detectChanges();

        queryParamMap$.next(convertToParamMap({ tab: 'programacion' }));

        expect(component.activeTabIndex()).toBe(1);
    });

    describe('setActiveTab', () => {
        it('should block tabs beyond index 1 until programacion is complete', () => {
            createComponent('5');
            component.stateService.setConvenio(buildConvenio({ programacionAcumulada: 200, montoAprobado: 1000 })); // 20%

            component.setActiveTab(3);

            expect(component.activeTabIndex()).toBe(0);
        });

        it('should allow deep tabs once programacion is complete, and load the kardex on tab 5', () => {
            createComponent('5');
            component.stateService.setConvenio(buildConvenio({ programacionAcumulada: 1000, montoAprobado: 1000 })); // 100%

            component.setActiveTab(5);

            expect(component.activeTabIndex()).toBe(5);
            expect(mockKardexRepo.getConsolidado).toHaveBeenCalledWith(5);
        });
    });

    describe('setTabIndexByTab', () => {
        it('should map simple tabs directly', () => {
            createComponent('5');
            component.setTabIndexByTab('ficha');
            expect(component.activeTabIndex()).toBe(0);

            component.setTabIndexByTab('programacion');
            expect(component.activeTabIndex()).toBe(1);
        });

        it('should fall back deep tabs to the programacion tab while it is incomplete', () => {
            createComponent('5');
            component.stateService.setConvenio(buildConvenio({ programacionAcumulada: 0, montoAprobado: 1000 }));

            component.setTabIndexByTab('rendiciones');

            expect(component.activeTabIndex()).toBe(1);
        });

        it('should jump deep tabs to their real index once programacion is complete', () => {
            createComponent('5');
            component.stateService.setConvenio(buildConvenio({ programacionAcumulada: 1000, montoAprobado: 1000 }));

            component.setTabIndexByTab('rendiciones');

            expect(component.activeTabIndex()).toBe(4);
        });
    });

    it('should navigate back to the convenio list', () => {
        createComponent('5');
        component.goBack();

        expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/main/convenios']);
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

    it('should clamp the execution percentage to 100 and guard a missing programado', () => {
        createComponent('5');
        expect(component.calculateExecutionPercentage(1500, 1000)).toBe(100);
        expect(component.calculateExecutionPercentage(250, 1000)).toBe(25);
        expect(component.calculateExecutionPercentage(250, 0)).toBe(0);
    });

    it('should format currency and dates, defaulting missing values to a dash', () => {
        createComponent('5');
        expect(component.formatCurrency(undefined)).toBe('-');
        expect(component.formatCurrency(1000)).toContain('1,000');
        expect(component.formatDate(undefined)).toBe('-');
    });
});

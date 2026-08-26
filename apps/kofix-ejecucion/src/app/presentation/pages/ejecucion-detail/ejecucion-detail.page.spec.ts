import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { AlertService } from '@agroideas/feedback';
import { PermissionService } from '@agroideas/security';
import { EjecucionDetailPageComponent } from './ejecucion-detail.page';
import { GetConvenioByIdUseCase } from '../../../domain/usecases/get-convenio-by-id.usecase';
import { KardexRepository } from '../../../domain/repositories/kardex.repository';
import { DesembolsoRepository } from '../../../domain/repositories/desembolso.repository';
import { CatalogoRepository } from '../../../domain/repositories/catalogo.repository';
import { RendicionRepository } from '../../../domain/repositories/rendicion.repository';
import { NoObjecionRepository } from '../../../domain/repositories/no-objecion.repository';
import { Convenio } from '../../../domain/models/convenio.model';

describe('EjecucionDetailPageComponent', () => {
    let component: EjecucionDetailPageComponent;
    let fixture: ComponentFixture<EjecucionDetailPageComponent>;
    let mockUseCase: jest.Mocked<Partial<GetConvenioByIdUseCase>>;
    let mockKardexRepo: jest.Mocked<Partial<KardexRepository>>;
    let mockDesembolsoRepo: jest.Mocked<Partial<DesembolsoRepository>>;
    let mockCatalogoRepo: jest.Mocked<Partial<CatalogoRepository>>;
    let mockRendicionRepo: jest.Mocked<Partial<RendicionRepository>>;
    let mockNoObjecionRepo: jest.Mocked<Partial<NoObjecionRepository>>;
    let mockAlert: jest.Mocked<Partial<AlertService>>;
    let mockPermissionService: jest.Mocked<Partial<PermissionService>>;
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
        programacionAcumulada: 1000,
        ejecucionAcumulada: 400,
        saldoDisponible: 600,
        asignadoA: 'Juan Pérez',
        email: 'juan@test.com',
        periodo: 2026,
        duracion: 12,
        ...overrides
    });

    const createComponent = (routeId: string | null = '5', queryParams: Record<string, string> = {}) => {
        mockRouter = { navigate: jest.fn() };

        TestBed.configureTestingModule({
            imports: [EjecucionDetailPageComponent],
            providers: [
                { provide: GetConvenioByIdUseCase, useValue: mockUseCase },
                { provide: KardexRepository, useValue: mockKardexRepo },
                { provide: DesembolsoRepository, useValue: mockDesembolsoRepo },
                { provide: CatalogoRepository, useValue: mockCatalogoRepo },
                { provide: RendicionRepository, useValue: mockRendicionRepo },
                { provide: NoObjecionRepository, useValue: mockNoObjecionRepo },
                { provide: AlertService, useValue: mockAlert },
                { provide: PermissionService, useValue: mockPermissionService },
                { provide: Router, useValue: mockRouter },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: {
                            paramMap: convertToParamMap(routeId ? { id: routeId } : {}),
                            queryParamMap: convertToParamMap(queryParams)
                        }
                    }
                }
            ]
        });

        fixture = TestBed.createComponent(EjecucionDetailPageComponent);
        component = fixture.componentInstance;
        return fixture;
    };

    beforeEach(() => {
        mockUseCase = { execute: jest.fn().mockReturnValue(of(buildConvenio())) };
        mockKardexRepo = { getConsolidado: jest.fn().mockReturnValue(of([])) };
        mockDesembolsoRepo = { getByPostulante: jest.fn().mockReturnValue(of({ items: [], total: 0 })) };
        mockCatalogoRepo = { getByGrupo: jest.fn().mockReturnValue(of([])) };
        mockRendicionRepo = { getByConvenio: jest.fn().mockReturnValue(of({ items: [], total: 0 })) };
        mockNoObjecionRepo = { getByPostulante: jest.fn().mockReturnValue(of({ items: [], total: 0 })) };
        mockAlert = { show: jest.fn(), confirm: jest.fn(), toast: jest.fn() };
        mockPermissionService = { hasPermission: jest.fn().mockReturnValue(false) };
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

    it('should default to the No Objeciones tab', () => {
        createComponent('5').detectChanges();

        expect(component.activeTabIndex()).toBe(0);
    });

    it('should switch tabs without loading the kardex for tabs 0-2', () => {
        createComponent('5').detectChanges();

        component.setActiveTab(1);

        expect(component.activeTabIndex()).toBe(1);
        expect(mockKardexRepo.getConsolidado).not.toHaveBeenCalled();
    });

    it('should load the kardex consolidado when switching to the Kardex & Varianza tab', () => {
        createComponent('5').detectChanges();

        component.setActiveTab(3);

        expect(component.activeTabIndex()).toBe(3);
        expect(mockKardexRepo.getConsolidado).toHaveBeenCalledWith(5);
    });

    it('should deep-link to the rendiciones tab via the ?tab= query param (e.g. returning from Gastos F1)', () => {
        createComponent('5', { tab: 'rendiciones' }).detectChanges();

        expect(component.activeTabIndex()).toBe(2);
        expect(mockKardexRepo.getConsolidado).not.toHaveBeenCalled();
    });

    it('should navigate back to the convenio ficha técnica', () => {
        createComponent('5').detectChanges();

        component.goBack();

        expect(mockRouter.navigate).toHaveBeenCalledWith(['/main/convenios', 5]);
    });

    it('should format currency, defaulting missing values to a dash', () => {
        createComponent('5');
        expect(component.formatCurrency(undefined)).toBe('-');
        expect(component.formatCurrency(1000)).toContain('1,000');
    });

    it('should format the convenio number, defaulting to a dash without a convenio', () => {
        createComponent('5');
        expect(component.formatConvenioNumber(undefined)).toBe('-');
    });
});

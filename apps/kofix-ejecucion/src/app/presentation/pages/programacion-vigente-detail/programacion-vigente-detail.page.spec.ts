import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { ProgramacionVigenteDetailPageComponent } from './programacion-vigente-detail.page';
import { GetConvenioByIdUseCase } from '../../../domain/usecases/get-convenio-by-id.usecase';
import { ProgramacionRepository } from '../../../domain/repositories/programacion.repository';
import { Convenio } from '../../../domain/models/convenio.model';

describe('ProgramacionVigenteDetailPageComponent', () => {
    let component: ProgramacionVigenteDetailPageComponent;
    let fixture: ComponentFixture<ProgramacionVigenteDetailPageComponent>;
    let mockUseCase: jest.Mocked<Partial<GetConvenioByIdUseCase>>;
    let mockProgramacionRepo: jest.Mocked<Partial<ProgramacionRepository>>;
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
        montoProgramado: 400,
        montoEjecutado: 0,
        saldoPorProgramar: 600,
        saldoPorEjecutar: 1000,
        programacionAcumulada: 400,
        ejecucionAcumulada: 0,
        saldoDisponible: 400,
        asignadoA: 'Juan Pérez',
        email: 'juan@test.com',
        periodo: 2026,
        duracion: 12,
        ...overrides
    });

    const createComponent = (routeId: string | null = '5') => {
        mockRouter = { navigate: jest.fn() };

        TestBed.configureTestingModule({
            imports: [ProgramacionVigenteDetailPageComponent],
            providers: [
                { provide: GetConvenioByIdUseCase, useValue: mockUseCase },
                { provide: ProgramacionRepository, useValue: mockProgramacionRepo },
                { provide: Router, useValue: mockRouter },
                {
                    provide: ActivatedRoute,
                    useValue: { snapshot: { paramMap: convertToParamMap(routeId ? { id: routeId } : {}) } }
                }
            ]
        });

        fixture = TestBed.createComponent(ProgramacionVigenteDetailPageComponent);
        component = fixture.componentInstance;
        return fixture;
    };

    beforeEach(() => {
        mockUseCase = { execute: jest.fn().mockReturnValue(of(buildConvenio())) };
        mockProgramacionRepo = {
            getByPostulante: jest.fn().mockReturnValue(of({ items: [], total: 0 })),
            getEstadoBloqueo: jest.fn().mockReturnValue(of({ postulanteId: 5, items: [], totalBloqueados: 0 }))
        };
    });

    it('should load the convenio for the route id on init', () => {
        createComponent('5').detectChanges();

        expect(mockUseCase.execute).toHaveBeenCalledWith(5);
        expect(component.convenio()?.id).toBe(5);
    });

    it('should not attempt to load without a route id', () => {
        createComponent(null).detectChanges();

        expect(mockUseCase.execute).not.toHaveBeenCalled();
    });

    it('should navigate back to the convenio ficha técnica', () => {
        createComponent('5').detectChanges();

        component.goBack();

        expect(mockRouter.navigate).toHaveBeenCalledWith(['/main/convenios', 5]);
    });

    it('should format the convenio number from the loaded convenio', () => {
        createComponent('5').detectChanges();

        expect(component.formatConvenioNumber()).toBe('0012-2026-ST');
    });
});

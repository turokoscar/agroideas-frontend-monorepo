import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ConvenioStateService } from './convenio-state.service';
import { GetConvenioByIdUseCase } from '../../domain/usecases/get-convenio-by-id.usecase';
import { Convenio } from '../../domain/models/convenio.model';

describe('ConvenioStateService', () => {
    let service: ConvenioStateService;
    let mockUseCase: jest.Mocked<Partial<GetConvenioByIdUseCase>>;

    const buildConvenio = (overrides: Partial<Convenio> = {}): Convenio => ({
        id: 1,
        numeroConvenio: 'CONV-001',
        ruc: '20100000001',
        razonSocial: 'Asociación Central',
        region: 'Cusco',
        estado: 'VIGENTE',
        fechaInicio: '2026-01-01',
        fechaFin: '2026-12-31',
        montoAprobado: 1000,
        montoProgramado: 500,
        montoEjecutado: 300,
        saldoPorProgramar: 500,
        saldoPorEjecutar: 700,
        programacionAcumulada: 500,
        ejecucionAcumulada: 300,
        saldoDisponible: 700,
        asignadoA: 'Juan Pérez',
        email: 'juan@test.com',
        periodo: 2026,
        duracion: 12,
        ...overrides
    });

    beforeEach(() => {
        mockUseCase = { execute: jest.fn() };

        TestBed.configureTestingModule({
            providers: [{ provide: GetConvenioByIdUseCase, useValue: mockUseCase }]
        });

        service = TestBed.inject(ConvenioStateService);
    });

    it('should start empty and not loading', () => {
        expect(service.convenio()).toBeNull();
        expect(service.loading()).toBe(false);
    });

    it('should populate the convenio and clear loading after a successful refresh', () => {
        const convenio = buildConvenio();
        mockUseCase.execute = jest.fn().mockReturnValue(of(convenio));

        service.refresh(1);

        expect(mockUseCase.execute).toHaveBeenCalledWith(1);
        expect(service.convenio()).toEqual(convenio);
        expect(service.loading()).toBe(false);
    });

    it('should clear loading even when the refresh fails', () => {
        mockUseCase.execute = jest.fn().mockReturnValue(throwError(() => new Error('network error')));

        service.refresh(1);

        expect(service.convenio()).toBeNull();
        expect(service.loading()).toBe(false);
    });

    it('should allow setting and clearing the convenio manually', () => {
        const convenio = buildConvenio();

        service.setConvenio(convenio);
        expect(service.convenio()).toEqual(convenio);

        service.clear();
        expect(service.convenio()).toBeNull();
    });

    describe('derived signals', () => {
        it('should default to 0 when there is no convenio loaded', () => {
            expect(service.saldoDisponible()).toBe(0);
            expect(service.porcentajeEjecucion()).toBe(0);
            expect(service.porcentajeProgramacion()).toBe(0);
            expect(service.isProgramacionCompleta()).toBe(false);
        });

        it('should compute saldoDisponible as programacionAcumulada minus ejecucionAcumulada', () => {
            service.setConvenio(buildConvenio({ programacionAcumulada: 800, ejecucionAcumulada: 300 }));
            expect(service.saldoDisponible()).toBe(500);
        });

        it('should compute execution and programming percentages against montoAprobado', () => {
            service.setConvenio(buildConvenio({ montoAprobado: 1000, ejecucionAcumulada: 250, programacionAcumulada: 750 }));

            expect(service.porcentajeEjecucion()).toBe(25);
            expect(service.porcentajeProgramacion()).toBe(75);
        });

        it('should avoid dividing by zero when montoAprobado is 0', () => {
            service.setConvenio(buildConvenio({ montoAprobado: 0, ejecucionAcumulada: 100, programacionAcumulada: 100 }));

            expect(service.porcentajeEjecucion()).toBe(0);
            expect(service.porcentajeProgramacion()).toBe(0);
        });

        it('should flag programacion as complete only when it rounds up to 100% or more', () => {
            service.setConvenio(buildConvenio({ montoAprobado: 1000, programacionAcumulada: 995 })); // 99.5% -> redondea a 100
            expect(service.isProgramacionCompleta()).toBe(true);

            service.setConvenio(buildConvenio({ montoAprobado: 1000, programacionAcumulada: 940 })); // 94% -> no completa
            expect(service.isProgramacionCompleta()).toBe(false);
        });
    });
});

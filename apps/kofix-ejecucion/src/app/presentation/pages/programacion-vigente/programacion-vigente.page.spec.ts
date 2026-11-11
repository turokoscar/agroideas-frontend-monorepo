import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { ProgramacionVigentePageComponent } from './programacion-vigente.page';
import { ConvenioRepository } from '../../../domain/repositories/convenio.repository';
import { CarteraRepository } from '../../../domain/repositories/cartera.repository';
import { ExportService } from '../../../shared/services/export.service';
import { Convenio } from '../../../domain/models/convenio.model';

describe('ProgramacionVigentePageComponent', () => {
    let component: ProgramacionVigentePageComponent;
    let fixture: ComponentFixture<ProgramacionVigentePageComponent>;
    let mockRepo: jest.Mocked<Partial<ConvenioRepository>>;
    let mockCarteraRepo: jest.Mocked<Partial<CarteraRepository>>;
    let router: Router;

    beforeEach(async () => {
        mockRepo = { getVigente: jest.fn().mockReturnValue(of({ datos: [], total: 0 })) };
        mockCarteraRepo = { getUbigeos: jest.fn().mockReturnValue(of([])) };

        await TestBed.configureTestingModule({
            imports: [ProgramacionVigentePageComponent],
            providers: [
                provideRouter([]),
                { provide: ConvenioRepository, useValue: mockRepo },
                { provide: CarteraRepository, useValue: mockCarteraRepo },
                { provide: ExportService, useValue: { exportProgramacionReporte: jest.fn() } }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ProgramacionVigentePageComponent);
        component = fixture.componentInstance;
        router = TestBed.inject(Router);
        jest.spyOn(router, 'navigate').mockResolvedValue(true);
    });

    const filtrosVacios = { periodo: undefined };

    const conv = (overrides: Partial<Convenio> = {}): Convenio => ({
        id: 1, numeroConvenio: '12', ruc: '20100000001', razonSocial: 'Asociación', region: 'Cusco',
        estado: 'VIGENTE', fechaInicio: '2026-06-01', fechaFin: '2026-12-31',
        montoAprobado: 1000, montoProgramado: 0, montoEjecutado: 0, saldoPorProgramar: 0, saldoPorEjecutar: 0,
        programacionAcumulada: 0, ejecucionAcumulada: 0, saldoDisponible: 0,
        asignadoA: '', email: '', periodo: 2026, duracion: 12,
        ...overrides
    });

    it('should auto-load the first page on init', () => {
        fixture.detectChanges();

        expect(mockRepo.getVigente).toHaveBeenCalledWith(1, 10, '', filtrosVacios);
    });

    it('should convert the lazy-load offset into a 1-based page', () => {
        component.pageSize.set(10);
        component.loadData({ first: 20, rows: 10 });

        expect(mockRepo.getVigente).toHaveBeenCalledWith(3, 10, '', filtrosVacios);
    });

    it('should merge the ubigeo filter into the next request and reset to page 1', () => {
        fixture.detectChanges();

        component.onUbigeoFiltroChange({ departamentoCodigo: '08', distritoCodigo: '080101' });

        expect(mockRepo.getVigente).toHaveBeenLastCalledWith(1, 10, '', {
            departamentoCodigo: '08',
            distritoCodigo: '080101',
            periodo: undefined
        });
    });

    it('should merge the periodo filter into the next request', () => {
        fixture.detectChanges();

        component.onPeriodoFiltroChange('2023');

        expect(mockRepo.getVigente).toHaveBeenLastCalledWith(1, 10, '', { periodo: 2023 });
    });

    it('should clamp the progress percentage to 100 and handle a missing montoAprobado', () => {
        expect(component.getPorcentajeProgramado(conv({ programacionAcumulada: 1500 }))).toBe(100);
        expect(component.getPorcentajeProgramado(conv({ programacionAcumulada: 250 }))).toBe(25);
        expect(component.getPorcentajeProgramado(conv({ montoAprobado: 0, programacionAcumulada: 250 }))).toBe(0);
    });

    it('should classify the status tone and label by threshold', () => {
        expect(component.getStatusTone(conv({ programacionAcumulada: 1000 }))).toBe('success');
        expect(component.getStatusTone(conv({ programacionAcumulada: 600 }))).toBe('info');
        expect(component.getStatusTone(conv({ programacionAcumulada: 100 }))).toBe('warning');
        expect(component.getStatusTone(conv({ programacionAcumulada: 0 }))).toBe('danger');

        expect(component.getStatusLabel(conv({ programacionAcumulada: 1000 }))).toBe('Programado');
        expect(component.getStatusLabel(conv({ programacionAcumulada: 600 }))).toBe('En proceso');
        expect(component.getStatusLabel(conv({ programacionAcumulada: 0 }))).toBe('No programado');
    });

    it('should navigate to the dedicated programacion-vigente detail page (ADR-019 Fase 3)', () => {
        component.goToProgramacion(conv({ id: 9 }));

        expect(router.navigate).toHaveBeenCalledWith(['/main/programacion-vigente', 9]);
    });

    it('should format the convenio number from the row, defaulting to a dash when missing', () => {
        expect(component.formatConvenioNumber(conv({ numeroConvenio: '12', fechaInicio: '2026-06-01' }))).toBe('0012-2026-ST');
        expect(component.formatConvenioNumber(conv({ numeroConvenio: '' }))).toBe('-');
    });

    it('should update pageSize when the table selector changes rows (ADR-019 Fase 3.5)', () => {
        component.onRowsChange(20);

        expect(component.pageSize()).toBe(20);
    });
});

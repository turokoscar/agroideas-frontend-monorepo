import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { EjecucionPageComponent } from './ejecucion.page';
import { ConvenioRepository } from '../../../domain/repositories/convenio.repository';
import { ExportService } from '../../../shared/services/export.service';

describe('EjecucionPageComponent', () => {
    let component: EjecucionPageComponent;
    let fixture: ComponentFixture<EjecucionPageComponent>;
    let mockRepo: jest.Mocked<Partial<ConvenioRepository>>;
    let router: Router;

    beforeEach(async () => {
        mockRepo = { getEnEjecucion: jest.fn().mockReturnValue(of({ datos: [], total: 0 })) };

        await TestBed.configureTestingModule({
            imports: [EjecucionPageComponent],
            providers: [
                provideRouter([]),
                { provide: ConvenioRepository, useValue: mockRepo },
                { provide: ExportService, useValue: { exportKardexConsolidado: jest.fn() } }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(EjecucionPageComponent);
        component = fixture.componentInstance;
        router = TestBed.inject(Router);
        jest.spyOn(router, 'navigate').mockResolvedValue(true);
    });

    it('should auto-load the first page on init', () => {
        fixture.detectChanges();

        expect(mockRepo.getEnEjecucion).toHaveBeenCalledWith(1, 10, '');
    });

    it('should convert the lazy-load offset into a 1-based page', () => {
        component.pageSize.set(10);
        component.loadData({ first: 20, rows: 10 });

        expect(mockRepo.getEnEjecucion).toHaveBeenCalledWith(3, 10, '');
    });

    it('should filter the loaded page client-side by estado when set', () => {
        mockRepo.getEnEjecucion = jest.fn().mockReturnValue(of({
            datos: [{ id: 1, estado: 'VIGENTE' }, { id: 2, estado: 'FINALIZADO' }],
            total: 2
        }));
        component.estadoFilter.set('VIGENTE');

        component.loadData({ first: 0, rows: 10 });

        expect(component.convenios()).toEqual([{ id: 1, estado: 'VIGENTE' }]);
    });

    it('should classify the status type and label', () => {
        expect(component.getStatusType({ estado: 'VIGENTE' })).toBe('Activo');
        expect(component.getStatusLabel({ estado: 'VIGENTE' })).toBe('Activo');
        expect(component.getStatusLabel({ estado: 'FINALIZADO' })).toBe('Finalizado');
    });

    it('should navigate to the ejecucion detail page', () => {
        component.gestionarEjecucion({ id: 9 });

        expect(router.navigate).toHaveBeenCalledWith(['/main/ejecucion', 9]);
    });

    it('should format the convenio number from the row, defaulting to a dash when missing', () => {
        expect(component.formatConvenioNumber({ numeroConvenio: '12', fechaInicio: '2026-06-01' })).toBe('0012-2026-ST');
        expect(component.formatConvenioNumber({})).toBe('-');
    });

    it('should update pageSize when the table selector changes rows (ADR-019 Fase 3.5)', () => {
        component.onRowsChange(100);

        expect(component.pageSize()).toBe(100);
    });
});

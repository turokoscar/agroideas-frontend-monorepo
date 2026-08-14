import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ProgramacionItemsComponent } from './programacion-items.component';
import { ProgramacionRepository } from '../../../domain/repositories/programacion.repository';
import { ConvenioStateService } from '../../../shared/services/convenio-state.service';
import { ProgramacionItem } from '../../../domain/models/programacion.model';

describe('ProgramacionItemsComponent', () => {
    let component: ProgramacionItemsComponent;
    let fixture: ComponentFixture<ProgramacionItemsComponent>;
    let mockRepo: jest.Mocked<Partial<ProgramacionRepository>>;
    let mockStateService: jest.Mocked<Partial<ConvenioStateService>>;

    const buildItem = (overrides: Partial<ProgramacionItem> = {}): ProgramacionItem => ({
        id: 1,
        item: 'Fertilizante',
        metaFisica: 100,
        metaFinanciera: 1000,
        montoAprobado: 1000,
        montoProgramado: 0,
        ...overrides
    });

    beforeEach(async () => {
        mockRepo = { getByPostulante: jest.fn().mockReturnValue(of({ items: [], total: 0 })) };
        mockStateService = { refresh: jest.fn() };

        await TestBed.configureTestingModule({
            imports: [ProgramacionItemsComponent],
            providers: [
                { provide: ProgramacionRepository, useValue: mockRepo },
                { provide: ConvenioStateService, useValue: mockStateService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ProgramacionItemsComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('convenioId', 5);
        fixture.componentRef.setInput('fechaInicio', '2026-01-01');
        fixture.componentRef.setInput('fechaFin', '2026-12-31');
    });

    it('should load page 1 on init', () => {
        fixture.detectChanges();

        expect(mockRepo.getByPostulante).toHaveBeenCalledWith(5, 1, 10);
    });

    it('should convert a lazy-load event into a 1-based page and reload', () => {
        fixture.detectChanges();

        component.onPageChange({ first: 20, rows: 10 });

        expect(component.currentPage()).toBe(3);
        expect(mockRepo.getByPostulante).toHaveBeenLastCalledWith(5, 3, 10);
    });

    it('should open the cronograma modal for the given item', () => {
        fixture.detectChanges();
        const item = buildItem();

        component.openCronograma(item);

        expect(component.selectedItem()).toBe(item);
    });

    it('should reload the items and refresh the convenio state after saving', () => {
        fixture.detectChanges();
        jest.clearAllMocks();

        component.onSaved();

        expect(mockRepo.getByPostulante).toHaveBeenCalled();
        expect(mockStateService.refresh).toHaveBeenCalledWith(5);
    });

    describe('alerta status/label', () => {
        it('should flag as Crítica / Sin Programar when nothing has been programmed', () => {
            const item = buildItem({ montoProgramado: 0, montoAprobado: 1000 });
            expect(component.getAlertaStatus(item)).toBe('Crítica');
            expect(component.getAlertaLabel(item)).toBe('Sin Programar');
        });

        it('should flag as Activo / Completo once programado reaches aprobado', () => {
            const item = buildItem({ montoProgramado: 1000, montoAprobado: 1000 });
            expect(component.getAlertaStatus(item)).toBe('Activo');
            expect(component.getAlertaLabel(item)).toBe('Completo');
        });

        it('should flag as Pendiente in between', () => {
            const item = buildItem({ montoProgramado: 400, montoAprobado: 1000 });
            expect(component.getAlertaStatus(item)).toBe('Pendiente');
            expect(component.getAlertaLabel(item)).toBe('Pendiente');
        });
    });
});

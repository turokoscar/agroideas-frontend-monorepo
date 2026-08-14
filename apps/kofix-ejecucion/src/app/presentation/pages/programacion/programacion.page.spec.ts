import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { ProgramacionPageComponent } from './programacion.page';
import { ProgramacionRepository } from '../../../domain/repositories/programacion.repository';

describe('ProgramacionPageComponent', () => {
    let component: ProgramacionPageComponent;
    let fixture: ComponentFixture<ProgramacionPageComponent>;
    let mockRepo: jest.Mocked<Partial<ProgramacionRepository>>;
    let router: Router;

    beforeEach(async () => {
        mockRepo = { getResumen: jest.fn().mockReturnValue(of({ items: [], total: 0 })) };

        await TestBed.configureTestingModule({
            imports: [ProgramacionPageComponent],
            providers: [provideRouter([]), { provide: ProgramacionRepository, useValue: mockRepo }]
        }).compileComponents();

        fixture = TestBed.createComponent(ProgramacionPageComponent);
        component = fixture.componentInstance;
        router = TestBed.inject(Router);
        jest.spyOn(router, 'navigate').mockResolvedValue(true);
    });

    it('should request page 1 when there is no lazy-load offset', () => {
        component.loadData({});

        expect(mockRepo.getResumen).toHaveBeenCalledWith(1, 10, '', '');
    });

    it('should convert the lazy-load offset into a 1-based page', () => {
        component.pageSize.set(20);
        component.loadData({ first: 40, rows: 20 });

        expect(mockRepo.getResumen).toHaveBeenCalledWith(3, 20, '', '');
    });

    it('should populate programaciones and totalRecords from the response', () => {
        mockRepo.getResumen = jest.fn().mockReturnValue(of({ items: [{ id: 1 }], total: 5 }));

        component.loadData({});

        expect(component.programaciones()).toEqual([{ id: 1 }]);
        expect(component.totalRecords()).toBe(5);
        expect(component.loading()).toBe(false);
    });

    it('should reset to the first page on search', () => {
        component.pageSize.set(15);
        component.onSearch();

        expect(mockRepo.getResumen).toHaveBeenCalledWith(1, 15, '', '');
    });

    it('should show a placeholder when numeroConvenio is missing', () => {
        expect(component.formatConvenioNumber({ numeroConvenio: '' } as any)).toBe('----');
        expect(component.getNumeroConvenioDisplay({ numeroConvenio: '' } as any)).toBe('---');
    });

    it('should navigate to the convenio detail with the programacion tab', () => {
        component.goToDetail(7);

        expect(router.navigate).toHaveBeenCalledWith(['/main/convenios', 7], { queryParams: { tab: 'programacion' } });
    });

    it('should map estado codes to their status type and label, defaulting unknown ones', () => {
        expect(component.getStatusType('VIGENTE')).toBe('Activo');
        expect(component.getStatusType('DESCONOCIDO')).toBe('Finalizado');
        expect(component.getStatusLabel('POR_INICIAR')).toBe('Por Iniciar');
        expect(component.getStatusLabel('DESCONOCIDO')).toBe('DESCONOCIDO');
    });
});

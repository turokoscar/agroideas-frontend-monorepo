import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { ProgramacionVigentePageComponent } from './programacion-vigente.page';
import { ConvenioRepository } from '../../../domain/repositories/convenio.repository';

describe('ProgramacionVigentePageComponent', () => {
    let component: ProgramacionVigentePageComponent;
    let fixture: ComponentFixture<ProgramacionVigentePageComponent>;
    let mockRepo: jest.Mocked<Partial<ConvenioRepository>>;
    let router: Router;

    beforeEach(async () => {
        mockRepo = { getVigente: jest.fn().mockReturnValue(of({ datos: [], total: 0 })) };

        await TestBed.configureTestingModule({
            imports: [ProgramacionVigentePageComponent],
            providers: [provideRouter([]), { provide: ConvenioRepository, useValue: mockRepo }]
        }).compileComponents();

        fixture = TestBed.createComponent(ProgramacionVigentePageComponent);
        component = fixture.componentInstance;
        router = TestBed.inject(Router);
        jest.spyOn(router, 'navigate').mockResolvedValue(true);
    });

    it('should auto-load the first page on init', () => {
        fixture.detectChanges();

        expect(mockRepo.getVigente).toHaveBeenCalledWith(1, 10, '');
    });

    it('should convert the lazy-load offset into a 1-based page', () => {
        component.pageSize.set(10);
        component.loadData({ first: 20, rows: 10 });

        expect(mockRepo.getVigente).toHaveBeenCalledWith(3, 10, '');
    });

    it('should clamp the progress percentage to 100 and handle a missing montoAprobado', () => {
        expect(component.getPorcentajeProgramado({ montoAprobado: 1000, programacionAcumulada: 1500 })).toBe(100);
        expect(component.getPorcentajeProgramado({ montoAprobado: 1000, programacionAcumulada: 250 })).toBe(25);
        expect(component.getPorcentajeProgramado({ montoAprobado: 0, programacionAcumulada: 250 })).toBe(0);
    });

    it('should fall back to aporteProgramadoAgroideas when montoAprobado is missing', () => {
        expect(component.getPorcentajeProgramado({ aporteProgramadoAgroideas: 500, programacionAcumulada: 250 })).toBe(50);
    });

    it('should classify the progress level by threshold', () => {
        expect(component.getProgressLevel({ montoAprobado: 1000, programacionAcumulada: 1000 })).toBe('full');
        expect(component.getProgressLevel({ montoAprobado: 1000, programacionAcumulada: 600 })).toBe('mid');
        expect(component.getProgressLevel({ montoAprobado: 1000, programacionAcumulada: 100 })).toBe('low');
    });

    it('should classify the status type and label by threshold', () => {
        expect(component.getStatusType({ montoAprobado: 1000, programacionAcumulada: 1000 })).toBe('Activo');
        expect(component.getStatusType({ montoAprobado: 1000, programacionAcumulada: 600 })).toBe('Media');
        expect(component.getStatusType({ montoAprobado: 1000, programacionAcumulada: 100 })).toBe('Pendiente');
        expect(component.getStatusType({ montoAprobado: 1000, programacionAcumulada: 0 })).toBe('Crítica');

        expect(component.getStatusLabel({ montoAprobado: 1000, programacionAcumulada: 1000 })).toBe('Programado');
        expect(component.getStatusLabel({ montoAprobado: 1000, programacionAcumulada: 0 })).toBe('No programado');
    });

    it('should navigate to the convenio detail with the programacion tab', () => {
        component.goToProgramacion({ id: 9 });

        expect(router.navigate).toHaveBeenCalledWith(['/main/convenios', 9], { queryParams: { tab: 'programacion' } });
    });
});

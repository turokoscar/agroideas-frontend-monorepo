import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReporteMensualDonutComponent } from './reporte-mensual-donut.component';

describe('ReporteMensualDonutComponent', () => {
    let component: ReporteMensualDonutComponent;
    let fixture: ComponentFixture<ReporteMensualDonutComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ReporteMensualDonutComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(ReporteMensualDonutComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('data', { mes: 0, programado: 1000, ejecutado: 800 });
        fixture.componentRef.setInput('year', 2026);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should compute the execution percentage capped at 100%', () => {
        expect(component.percentDisplay()).toBe(80);

        fixture.componentRef.setInput('data', { mes: 0, programado: 1000, ejecutado: 1500 });
        expect(component.displayPct()).toBe(1);
        expect(component.percentDisplay()).toBe(100);
    });

    it('should report "Sin programación" when there is execution without a program', () => {
        fixture.componentRef.setInput('data', { mes: 0, programado: 0, ejecutado: 500 });

        expect(component.hasProgram()).toBe(false);
        expect(component.percentDisplay()).toBeNull();
        expect(component.centerLabel()).toBe('N/P');
        expect(component.statusLabel()).toBe('Sin programación');
    });

    it('should report "Sin ejecución" when there is neither program nor execution', () => {
        fixture.componentRef.setInput('data', { mes: 0, programado: 0, ejecutado: 0 });

        expect(component.centerLabel()).toBe('0%');
        expect(component.statusLabel()).toBe('Sin ejecución');
    });

    it('should classify status by execution percentage', () => {
        fixture.componentRef.setInput('data', { mes: 0, programado: 1000, ejecutado: 900 });
        expect(component.statusLabel()).toBe('Excelente');
        expect(component.colorClass()).toBe('donut-arc--success');

        fixture.componentRef.setInput('data', { mes: 0, programado: 1000, ejecutado: 600 });
        expect(component.statusLabel()).toBe('En progreso');
        expect(component.colorClass()).toBe('donut-arc--warning');

        fixture.componentRef.setInput('data', { mes: 0, programado: 1000, ejecutado: 100 });
        expect(component.statusLabel()).toBe('Atrasado');
        expect(component.colorClass()).toBe('donut-arc--danger');
    });

    it('should emit the previous/next year within bounds', () => {
        const spy = jest.fn();
        component.onYearChange.subscribe(spy);

        component.prevYear();
        expect(spy).toHaveBeenCalledWith(2025);

        component.nextYear();
        expect(spy).toHaveBeenCalledWith(2027);
    });

    it('should not emit when the year would go below minYear', () => {
        fixture.componentRef.setInput('year', component.minYear);
        const spy = jest.fn();
        component.onYearChange.subscribe(spy);

        component.prevYear();

        expect(spy).not.toHaveBeenCalled();
    });

    it('should not emit when the year would go above maxYear', () => {
        fixture.componentRef.setInput('year', component.maxYear);
        const spy = jest.fn();
        component.onYearChange.subscribe(spy);

        component.nextYear();

        expect(spy).not.toHaveBeenCalled();
    });

    it('should format currency with two decimals', () => {
        expect(component.formatCurrency(1500)).toContain('1,500.00');
    });
});

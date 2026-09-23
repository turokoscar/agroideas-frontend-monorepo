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
        expect(component.statusColor()).toBe('success');

        fixture.componentRef.setInput('data', { mes: 0, programado: 1000, ejecutado: 600 });
        expect(component.statusLabel()).toBe('En progreso');
        expect(component.statusColor()).toBe('warning');

        fixture.componentRef.setInput('data', { mes: 0, programado: 1000, ejecutado: 100 });
        expect(component.statusLabel()).toBe('Atrasado');
        expect(component.statusColor()).toBe('danger');
        expect(component.statusPillClass()).toContain('text-danger');
    });

    it('should split the ring into ejecutado and por ejecutar, colored by status', () => {
        const [ring] = component.datasets();

        expect(ring.data).toEqual([800, 200]);
        expect(ring.color).toEqual(['success', 'muted']);
    });

    it('should cap the ejecutado segment at the programmed amount', () => {
        fixture.componentRef.setInput('data', { mes: 0, programado: 1000, ejecutado: 1500 });

        expect(component.datasets()[0].data).toEqual([1000, 0]);
    });

    it('should draw an empty muted ring when there is no data', () => {
        fixture.componentRef.setInput('data', { mes: 0, programado: 0, ejecutado: 0 });

        expect(component.datasets()[0].data).toEqual([0, 1]);
        expect(component.statusColor()).toBe('info');
    });

    it('should show the year without navigation arrows', () => {
        expect(fixture.nativeElement.querySelector('button')).toBeNull();
        expect(fixture.nativeElement.textContent).toContain('Año 2026');
    });

    it('should format currency with two decimals', () => {
        expect(component.formatCurrency(1500)).toContain('1,500.00');
    });
});

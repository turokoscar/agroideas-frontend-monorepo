import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReporteMensualChartComponent, ReporteMensualItem } from './reporte-mensual-chart.component';

describe('ReporteMensualChartComponent', () => {
    let component: ReporteMensualChartComponent;
    let fixture: ComponentFixture<ReporteMensualChartComponent>;

    const buildData = (): ReporteMensualItem[] =>
        Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, programado: 1000 * (i + 1), ejecutado: 500 * (i + 1) }));

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ReporteMensualChartComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(ReporteMensualChartComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('data', buildData());
        fixture.componentRef.setInput('selectedYear', 2026);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should build programado and ejecutado series with 12 months', () => {
        const [programado, ejecutado] = component.datasets();

        expect(programado.label).toBe('Programado');
        expect(programado.data).toHaveLength(12);
        expect(programado.data[11]).toBe(12000);
        expect(ejecutado.data[0]).toBe(500);
    });

    it('should place each value by its mes, filling missing months with 0', () => {
        fixture.componentRef.setInput('data', [
            { mes: 7, programado: 300, ejecutado: 100 },
            { mes: 3, programado: 200, ejecutado: 50 }
        ]);

        const [programado, ejecutado] = component.datasets();

        expect(programado.data).toEqual([0, 0, 200, 0, 0, 0, 300, 0, 0, 0, 0, 0]);
        expect(ejecutado.data[2]).toBe(50);
        expect(ejecutado.data[6]).toBe(100);
    });

    it('should ignore months out of range and coerce non-numeric values', () => {
        fixture.componentRef.setInput('data', [
            { mes: 13, programado: 999, ejecutado: 999 },
            { mes: 1, programado: 'abc' as unknown as number, ejecutado: 10 }
        ]);

        const [programado, ejecutado] = component.datasets();

        expect(programado.data.every((v) => v === 0)).toBe(true);
        expect(ejecutado.data[0]).toBe(10);
    });

    it('should not own a year selector (the page drives the period)', () => {
        expect(fixture.nativeElement.querySelector('select')).toBeNull();
        expect(fixture.nativeElement.textContent).toContain('Año 2026');
    });

    it('should render the shared ui-chart with an accessible label for the year', () => {
        const chart: HTMLElement = fixture.nativeElement.querySelector('app-ui-chart canvas');
        expect(chart.getAttribute('aria-label')).toContain('2026');
    });
});

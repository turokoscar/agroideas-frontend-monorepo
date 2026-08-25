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

    it('should default maxYVal when there is no data', () => {
        fixture.componentRef.setInput('data', []);
        expect(component.maxYVal()).toBe(100000);
    });

    it('should scale maxYVal 15% above the largest value', () => {
        expect(component.maxYVal()).toBe(12000 * 1.15);
    });

    it('should build non-empty SVG paths for programado and ejecutado', () => {
        expect(component.programadoPath()).toMatch(/^M /);
        expect(component.ejecutadoPath()).toMatch(/^M /);
    });

    it('should return empty paths when there is no data', () => {
        fixture.componentRef.setInput('data', []);
        expect(component.programadoPath()).toBe('');
        expect(component.ejecutadoPath()).toBe('');
    });

    it('should emit onYearChange when a year is selected', () => {
        const spy = jest.fn();
        component.onYearChange.subscribe(spy);

        component.onYearSelect(2025);

        expect(spy).toHaveBeenCalledWith(2025);
    });

    it('should show and hide the tooltip for a given month index', () => {
        component.showTooltip(0, {} as MouseEvent);
        expect(component.activeTooltip()).toMatchObject({ index: 0, mesName: 'Ene' });

        component.hideTooltip();
        expect(component.activeTooltip()).toBeNull();
    });

    it('should format currency without decimals', () => {
        expect(component.formatCurrency(1500)).not.toContain('.00');
    });
});

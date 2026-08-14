import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReportesPageComponent } from './reportes.page';

describe('ReportesPageComponent', () => {
    let component: ReportesPageComponent;
    let fixture: ComponentFixture<ReportesPageComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ReportesPageComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(ReportesPageComponent);
        component = fixture.componentInstance;
    });

    it('should select the matching reporte option on change', () => {
        component.onReporteChange({ value: 'kardex' });

        expect(component.selectedReporte()?.label).toBe('Kardex de Movimientos');
    });

    it('should clear the selection when the value has no matching option', () => {
        component.onReporteChange({ value: 'inexistente' });

        expect(component.selectedReporte()).toBeNull();
    });

    it('should not start generating a report without a selection', () => {
        component.generarReporte();

        expect(component.loading()).toBe(false);
    });

    it('should toggle loading off after generating a selected report', () => {
        component.onReporteChange({ value: 'kardex' });

        component.generarReporte();

        expect(component.loading()).toBe(false);
    });
});

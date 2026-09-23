import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResumenEjecutivoComponent } from './resumen-ejecutivo.component';

describe('ResumenEjecutivoComponent', () => {
    let component: ResumenEjecutivoComponent;
    let fixture: ComponentFixture<ResumenEjecutivoComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ResumenEjecutivoComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(ResumenEjecutivoComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('data', {
            totalConvenios: 10,
            conveniosActivos: 7,
            programacionAcumulada: 1000,
            ejecucionAcumulada: 400,
            saldoDisponible: 600
        });
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should format currency, defaulting missing values to S/ 0.00', () => {
        expect(component.formatCurrency(undefined)).toBe('S/ 0.00');
        expect(component.formatCurrency(1000)).toContain('1,000');
    });

    it('should compute the execution percentage', () => {
        expect(component.getPercent(400, 1000)).toBe('40.0%');
    });

    it('should default to 0.0% when there is nothing programmed', () => {
        expect(component.getPercent(400, 0)).toBe('0.0%');
    });

    it('should compute progress percentage with boundaries [0, 100]', () => {
        expect(component.getProgressPercent(50, 100)).toBe(50);
        expect(component.getProgressPercent(0, 0)).toBe(0);
        expect(component.getProgressPercent(-10, 100)).toBe(0);
        expect(component.getProgressPercent(150, 100)).toBe(100);
    });

    it('should render 4 app-ui-kpi components', () => {
        const kpis = fixture.nativeElement.querySelectorAll('app-ui-kpi');
        expect(kpis.length).toBe(4);
    });
});

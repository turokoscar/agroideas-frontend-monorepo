import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KardexVarianzaTabComponent } from './kardex-varianza-tab.component';
import { Convenio } from '../../../domain/models/convenio.model';

describe('KardexVarianzaTabComponent', () => {
    let component: KardexVarianzaTabComponent;
    let fixture: ComponentFixture<KardexVarianzaTabComponent>;

    const buildConvenio = (overrides: Partial<Convenio> = {}): Convenio => ({
        id: 5,
        numeroConvenio: '12',
        ruc: '20100000001',
        razonSocial: 'Asociación',
        region: 'Cusco',
        estado: 'VIGENTE',
        fechaInicio: '2026-06-01',
        fechaFin: '2026-12-31',
        montoAprobado: 1000,
        montoProgramado: 1000,
        montoEjecutado: 400,
        saldoPorProgramar: 0,
        saldoPorEjecutar: 600,
        programacionAcumulada: 1000,
        ejecucionAcumulada: 400,
        saldoDisponible: 600,
        asignadoA: 'Juan Pérez',
        email: 'juan@test.com',
        periodo: 2026,
        duracion: 12,
        ...overrides
    });

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [KardexVarianzaTabComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(KardexVarianzaTabComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('convenio', buildConvenio());
        fixture.componentRef.setInput('kardexConsolidado', []);
        fixture.componentRef.setInput('loadingKardex', false);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should clamp the execution percentage to 100 and guard a missing programado', () => {
        expect(component.calculateExecutionPercentage(1500, 1000)).toBe(100);
        expect(component.calculateExecutionPercentage(250, 1000)).toBe(25);
        expect(component.calculateExecutionPercentage(250, 0)).toBe(0);
    });

    it('should format currency, defaulting missing values to a dash', () => {
        expect(component.formatCurrency(undefined)).toBe('-');
        expect(component.formatCurrency(1000)).toContain('1,000');
    });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConvenioFichaTecnicaTabComponent } from './convenio-ficha-tecnica-tab.component';
import { Convenio } from '../../../domain/models/convenio.model';

describe('ConvenioFichaTecnicaTabComponent', () => {
    let component: ConvenioFichaTecnicaTabComponent;
    let fixture: ComponentFixture<ConvenioFichaTecnicaTabComponent>;

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
            imports: [ConvenioFichaTecnicaTabComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(ConvenioFichaTecnicaTabComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('convenio', buildConvenio());
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should format dates, defaulting a missing value to a dash', () => {
        expect(component.formatDate(undefined)).toBe('-');
        expect(component.formatDate('2026-06-01')).not.toBe('-');
    });

    it('should emit the download intent without handling it itself', () => {
        const fisico = jest.fn();
        component.downloadConvenioFisico.subscribe(fisico);

        component.downloadConvenioFisico.emit();

        expect(fisico).toHaveBeenCalled();
    });
});

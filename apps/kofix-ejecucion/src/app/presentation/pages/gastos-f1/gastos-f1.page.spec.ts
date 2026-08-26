import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { AlertService } from '@agroideas/feedback';
import { GastosF1PageComponent } from './gastos-f1.page';
import { GetConvenioByIdUseCase } from '../../../domain/usecases/get-convenio-by-id.usecase';
import { RendicionRepository } from '../../../domain/repositories/rendicion.repository';
import { Convenio } from '../../../domain/models/convenio.model';
import { GastoF1 } from '../../../domain/models/rendicion.model';

describe('GastosF1PageComponent', () => {
    let component: GastosF1PageComponent;
    let fixture: ComponentFixture<GastosF1PageComponent>;
    let mockUseCase: jest.Mocked<Partial<GetConvenioByIdUseCase>>;
    let mockRendicionRepo: jest.Mocked<Partial<RendicionRepository>>;
    let mockAlert: jest.Mocked<Partial<AlertService>>;
    let mockRouter: { navigate: jest.Mock };

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

    const buildGasto = (overrides: Partial<GastoF1> = {}): GastoF1 => ({
        rendicionId: 1,
        itemNombre: 'Fertilizante',
        unidadMedida: 'UNIDAD',
        cantidad: 2,
        precioAdjudicado: 500,
        montoRendido: 300,
        fechaEmision: '2026-08-01',
        serieNumero: 'F001-123',
        tipoCpe: 'FACTURA',
        proveedorNombre: 'Proveedor SAC',
        proveedorRuc: '20100000002',
        archivoUrl: 'rendiciones/comprobante.pdf',
        ...overrides
    });

    const createComponent = (routeId: string | null = '5') => {
        TestBed.configureTestingModule({
            imports: [GastosF1PageComponent],
            providers: [
                { provide: GetConvenioByIdUseCase, useValue: mockUseCase },
                { provide: RendicionRepository, useValue: mockRendicionRepo },
                { provide: AlertService, useValue: mockAlert },
                { provide: Router, useValue: mockRouter },
                {
                    provide: ActivatedRoute,
                    useValue: { snapshot: { paramMap: convertToParamMap(routeId ? { id: routeId } : {}) } }
                }
            ]
        });

        fixture = TestBed.createComponent(GastosF1PageComponent);
        component = fixture.componentInstance;
        return fixture;
    };

    beforeEach(() => {
        mockUseCase = { execute: jest.fn().mockReturnValue(of(buildConvenio())) };
        mockRendicionRepo = { getGastosF1: jest.fn().mockReturnValue(of([buildGasto()])), downloadFile: jest.fn() };
        mockAlert = { show: jest.fn() };
        mockRouter = { navigate: jest.fn() };
    });

    it('should load the convenio and the gastos F1 for the route id on init', () => {
        createComponent('5').detectChanges();

        expect(mockUseCase.execute).toHaveBeenCalledWith(5);
        expect(mockRendicionRepo.getGastosF1).toHaveBeenCalledWith(5);
        expect(component.gastos()).toHaveLength(1);
        expect(component.convenio()?.id).toBe(5);
    });

    it('should not query anything without a route id', () => {
        createComponent(null).detectChanges();

        expect(mockUseCase.execute).not.toHaveBeenCalled();
        expect(mockRendicionRepo.getGastosF1).not.toHaveBeenCalled();
    });

    it('should compute the total monto rendido from the loaded gastos', () => {
        mockRendicionRepo.getGastosF1 = jest.fn().mockReturnValue(of([buildGasto({ montoRendido: 300 }), buildGasto({ montoRendido: 200 })]));
        createComponent('5').detectChanges();

        expect(component.totalMontoRendido()).toBe(500);
    });

    it('should navigate back to the rendiciones tab of the convenio', () => {
        createComponent('5').detectChanges();

        component.goBack();

        expect(mockRouter.navigate).toHaveBeenCalledWith(['/main/convenios', 5], { queryParams: { tab: 'rendiciones' } });
    });

    it('should download the comprobante file via the repository', () => {
        const blob = new Blob(['x']);
        mockRendicionRepo.downloadFile = jest.fn().mockReturnValue(of(blob));
        createComponent('5').detectChanges();

        component.downloadArchivo('rendiciones/comprobante.pdf');

        expect(mockRendicionRepo.downloadFile).toHaveBeenCalledWith('rendiciones/comprobante.pdf');
    });

    it('should show an alert when the download fails', () => {
        mockRendicionRepo.downloadFile = jest.fn().mockReturnValue({
            subscribe: ({ error }: any) => error(new Error('fail'))
        } as any);
        createComponent('5').detectChanges();

        component.downloadArchivo('rendiciones/comprobante.pdf');

        expect(mockAlert.show).toHaveBeenCalledWith('Error', 'No se pudo descargar el comprobante.', 'error');
    });
});

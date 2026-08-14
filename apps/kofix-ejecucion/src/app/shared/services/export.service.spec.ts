import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AlertService } from '@agroideas/feedback';
import { ExportService } from './export.service';
import { KardexRepository } from '../../domain/repositories/kardex.repository';
import { ConvenioRepository } from '../../domain/repositories/convenio.repository';
import { KardexConsolidado } from '../../domain/models/kardex.model';

describe('ExportService', () => {
    let service: ExportService;
    let mockAlert: jest.Mocked<Partial<AlertService>>;
    let mockKardexRepo: jest.Mocked<Partial<KardexRepository>>;
    let mockConvenioRepo: jest.Mocked<Partial<ConvenioRepository>>;

    const kardexItem: KardexConsolidado = {
        itemMlId: 1,
        itemDescripcion: 'Fertilizante',
        montoProgramado: 1000,
        montoComprometido: 800,
        montoEfectivizado: 700,
        montoRendido: 600,
        saldo: 300
    };

    beforeEach(() => {
        mockAlert = { toast: jest.fn(), show: jest.fn() };
        mockKardexRepo = { getConsolidado: jest.fn() };
        mockConvenioRepo = { getCronogramasMensuales: jest.fn() };

        TestBed.configureTestingModule({
            providers: [
                { provide: AlertService, useValue: mockAlert },
                { provide: KardexRepository, useValue: mockKardexRepo },
                { provide: ConvenioRepository, useValue: mockConvenioRepo }
            ]
        });

        service = TestBed.inject(ExportService);

        // jsdom no implementa URL.createObjectURL ni el click de descarga; se simulan para
        // poder ejercitar el flujo completo sin depender de un navegador real.
        window.URL.createObjectURL = jest.fn().mockReturnValue('blob:mock-url');
        window.URL.revokeObjectURL = jest.fn();
        HTMLAnchorElement.prototype.click = jest.fn();
    });

    describe('exportKardexConsolidado', () => {
        it('should warn when the kardex has no movements', () => {
            mockKardexRepo.getConsolidado = jest.fn().mockReturnValue(of([]));

            service.exportKardexConsolidado(5, 'CONV-005');

            expect(mockAlert.toast).toHaveBeenCalledWith('Generando reporte Kardex...');
            expect(mockAlert.show).toHaveBeenCalledWith(
                'Sin Datos',
                expect.stringContaining('CONV-005'),
                'warning'
            );
        });

        it('should show an error alert when the repository call fails', () => {
            mockKardexRepo.getConsolidado = jest.fn().mockReturnValue(throwError(() => new Error('boom')));

            service.exportKardexConsolidado(5, 'CONV-005');

            expect(mockAlert.show).toHaveBeenCalledWith(
                'Error',
                'No se pudo generar el reporte del Kardex.',
                'error'
            );
        });

        it('should trigger the download and confirm completion when there is data', () => {
            mockKardexRepo.getConsolidado = jest.fn().mockReturnValue(of([kardexItem]));

            service.exportKardexConsolidado(5, 'CONV-005');

            expect(window.URL.createObjectURL).toHaveBeenCalled();
            expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
            expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
            expect(mockAlert.toast).toHaveBeenCalledWith('Exportación de Kardex completada.');
            expect(mockAlert.show).not.toHaveBeenCalled();
        });
    });

    describe('exportProgramacionReporte', () => {
        it('should warn when there is no cronograma data', () => {
            mockConvenioRepo.getCronogramasMensuales = jest.fn().mockReturnValue(of({ cronograma: [] }));

            service.exportProgramacionReporte(5, 'CONV-005');

            expect(mockAlert.toast).toHaveBeenCalledWith('Generando reporte PDF de programación...');
            expect(mockAlert.show).toHaveBeenCalledWith(
                'Sin Datos',
                expect.stringContaining('CONV-005'),
                'warning'
            );
        });

        it('should show an error alert when the repository call fails', () => {
            mockConvenioRepo.getCronogramasMensuales = jest.fn().mockReturnValue(throwError(() => new Error('boom')));

            service.exportProgramacionReporte(5, 'CONV-005');

            expect(mockAlert.show).toHaveBeenCalledWith(
                'Error',
                'No se pudo generar el reporte de programación.',
                'error'
            );
        });
    });
});

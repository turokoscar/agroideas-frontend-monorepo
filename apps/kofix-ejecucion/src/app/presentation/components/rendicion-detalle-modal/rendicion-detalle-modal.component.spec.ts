import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AlertService } from '@agroideas/feedback';
import { RendicionDetalleModalComponent } from './rendicion-detalle-modal.component';
import { RendicionRepository } from '../../../domain/repositories/rendicion.repository';
import { Rendicion, RendicionDetalle } from '../../../domain/models/rendicion.model';

describe('RendicionDetalleModalComponent', () => {
    let component: RendicionDetalleModalComponent;
    let fixture: ComponentFixture<RendicionDetalleModalComponent>;
    let mockRepo: jest.Mocked<Partial<RendicionRepository>>;
    let mockAlert: jest.Mocked<Partial<AlertService>>;

    const buildRendicion = (overrides: Partial<Rendicion> = {}): Rendicion => ({
        id: 9,
        solicitudDesembolsoId: 1,
        sunatCpeId: 1,
        numeroSolicitud: '12',
        tipoCpe: 'FACTURA',
        serie: 'F001',
        numero: '000123',
        serieNumero: 'F001-000123',
        fechaEmision: '2026-08-01',
        total: 300,
        observacion: '',
        estado: 1,
        ...overrides
    });

    const buildDetalle = (overrides: Partial<RendicionDetalle> = {}): RendicionDetalle => ({
        id: 9,
        solicitudDesembolsoId: 1,
        sunatCpeId: 1,
        serie: 'F001',
        numero: '000123',
        fechaEmision: '2026-08-01T00:00:00',
        total: 300,
        observacion: '',
        estado: 1,
        detalles: [
            { solicitudDesembolsoDetId: 100, itemNombre: 'Fertilizante', montoDesembolsado: 500, montoRendido: 300, saldoDisponible: 200 }
        ],
        archivos: [{ tipoArchivoId: 1, urlArchivo: 'https://archivos/comprobante.pdf' }],
        ...overrides
    });

    beforeEach(async () => {
        mockRepo = { getById: jest.fn().mockReturnValue(of(buildDetalle())), downloadFile: jest.fn() };
        mockAlert = { show: jest.fn() };

        await TestBed.configureTestingModule({
            imports: [RendicionDetalleModalComponent],
            providers: [
                { provide: RendicionRepository, useValue: mockRepo },
                { provide: AlertService, useValue: mockAlert }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(RendicionDetalleModalComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('rendicion', buildRendicion());
    });

    it('should load the real detalle by rendicion id and stop loading', () => {
        fixture.detectChanges();

        expect(mockRepo.getById).toHaveBeenCalledWith(9);
        expect(component.loading()).toBe(false);
        expect(component.detalle()?.detalles).toHaveLength(1);
    });

    it('should stop loading when the request fails', () => {
        mockRepo.getById = jest.fn().mockReturnValue(throwError(() => new Error('boom')));
        fixture.detectChanges();

        expect(component.loading()).toBe(false);
        expect(component.detalle()).toBeNull();
    });

    it('should map estado to the Activo/Registrado badge when active', () => {
        fixture.detectChanges();

        expect(component.badgeStatus).toBe('Activo');
        expect(component.badgeText).toBe('Registrado');
    });

    it('should map estado to the Rechazado/Anulado badge when inactive', () => {
        fixture.componentRef.setInput('rendicion', buildRendicion({ estado: 0 }));
        fixture.detectChanges();

        expect(component.badgeStatus).toBe('Rechazado');
        expect(component.badgeText).toBe('Anulado');
    });

    it('should format the solicitud number with the padded year', () => {
        fixture.detectChanges();

        expect(component.formatSolicitudNumber()).toBe('0012-2026');
    });

    it('should download the comprobante and show an error toast on failure', () => {
        fixture.detectChanges();
        mockRepo.downloadFile = jest.fn().mockReturnValue(throwError(() => new Error('boom')));

        component.downloadArchivo('https://archivos/comprobante.pdf');

        expect(mockRepo.downloadFile).toHaveBeenCalledWith('https://archivos/comprobante.pdf');
        expect(mockAlert.show).toHaveBeenCalledWith('Error', expect.any(String), 'error');
    });

    it('should emit close and hide when onHide is triggered', () => {
        fixture.detectChanges();
        let closed = false;
        component.close.subscribe(() => (closed = true));

        component.onHide();

        expect(closed).toBe(true);
        expect(component.visible()).toBe(false);
    });
});

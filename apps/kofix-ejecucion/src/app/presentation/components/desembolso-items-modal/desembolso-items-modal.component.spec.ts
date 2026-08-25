import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { DesembolsoItemsModalComponent } from './desembolso-items-modal.component';
import { DesembolsoRepository } from '../../../domain/repositories/desembolso.repository';
import { Desembolso, DesembolsoDetalleItem } from '../../../domain/models/desembolso.model';

describe('DesembolsoItemsModalComponent', () => {
    let component: DesembolsoItemsModalComponent;
    let fixture: ComponentFixture<DesembolsoItemsModalComponent>;
    let mockRepo: jest.Mocked<Partial<DesembolsoRepository>>;

    const buildDesembolso = (overrides: Partial<Desembolso> = {}): Desembolso => ({
        id: 9,
        fechaSolicitud: '2026-08-01',
        estadoId: 1,
        estadoNombre: 'PENDIENTE',
        tipoPagoNombre: 'TRANSFERENCIA',
        montoTotalDesembolsado: 500,
        montoRendido: 0,
        numeroNoObjecion: '0001-2026',
        numeroSolicitud: '12',
        ...overrides
    });

    const buildItem = (overrides: Partial<DesembolsoDetalleItem> = {}): DesembolsoDetalleItem => ({
        id: 1,
        noObjecionDetId: 10,
        noObjecionCodigo: '0001-2026',
        itemNombre: 'Fertilizante',
        proveedorNombre: 'Proveedor S.A.',
        montoSolicitado: 500,
        ...overrides
    });

    beforeEach(async () => {
        mockRepo = { getDetalle: jest.fn().mockReturnValue(of([buildItem()])) };

        await TestBed.configureTestingModule({
            imports: [DesembolsoItemsModalComponent],
            providers: [{ provide: DesembolsoRepository, useValue: mockRepo }]
        }).compileComponents();

        fixture = TestBed.createComponent(DesembolsoItemsModalComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('desembolso', buildDesembolso());
    });

    it('should load the detail items by desembolso id and stop loading', () => {
        fixture.detectChanges();

        expect(mockRepo.getDetalle).toHaveBeenCalledWith(9);
        expect(component.loading()).toBe(false);
        expect(component.items()).toHaveLength(1);
    });

    it('should sum montoSolicitado across the detail rows', () => {
        mockRepo.getDetalle = jest.fn().mockReturnValue(of([
            buildItem({ id: 1, montoSolicitado: 300 }),
            buildItem({ id: 2, montoSolicitado: 200 })
        ]));
        fixture.detectChanges();

        expect(component.total()).toBe(500);
    });

    it('should format the solicitud number with the padded year', () => {
        fixture.detectChanges();

        expect(component.formatSolicitudNumber()).toBe('0012-2026');
    });

    it('should stop loading when the request fails', () => {
        mockRepo.getDetalle = jest.fn().mockReturnValue(of([]));
        fixture.detectChanges();

        expect(component.loading()).toBe(false);
        expect(component.items()).toEqual([]);
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

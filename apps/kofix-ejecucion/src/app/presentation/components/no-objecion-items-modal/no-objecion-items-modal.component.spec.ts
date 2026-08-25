import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { NoObjecionItemsModalComponent } from './no-objecion-items-modal.component';
import { NoObjecionRepository } from '../../../domain/repositories/no-objecion.repository';
import { NoObjecion } from '../../../domain/models/no-objecion.model';

describe('NoObjecionItemsModalComponent', () => {
    let component: NoObjecionItemsModalComponent;
    let fixture: ComponentFixture<NoObjecionItemsModalComponent>;
    let mockRepo: jest.Mocked<Partial<NoObjecionRepository>>;

    const buildNoObjecion = (overrides: Partial<NoObjecion> = {}): NoObjecion => ({
        id: 9,
        tipoDocumentoId: 1,
        numeroDocumento: '0012-2026',
        fechaDocumento: '2026-08-01',
        postulanteId: 5,
        detalles: [
            { itemMlId: 1, itemNombre: 'Fertilizante', itemCodigo: 'IT-1', cantidad: 10, precioAdjudicado: 10, montoAdjudicado: 100, rucProveedor: '12345678901', razonSocialProveedor: 'Prov', tipoItemRef: 1 }
        ],
        ...overrides
    });

    beforeEach(async () => {
        mockRepo = { getById: jest.fn().mockReturnValue(of(buildNoObjecion())) };

        await TestBed.configureTestingModule({
            imports: [NoObjecionItemsModalComponent],
            providers: [{ provide: NoObjecionRepository, useValue: mockRepo }]
        }).compileComponents();

        fixture = TestBed.createComponent(NoObjecionItemsModalComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('noObjecionId', 9);
    });

    it('should load the no-objecion by id and stop loading', () => {
        fixture.detectChanges();

        expect(mockRepo.getById).toHaveBeenCalledWith(9);
        expect(component.loading()).toBe(false);
        expect(component.noObjecion()?.detalles).toHaveLength(1);
    });

    it('should sum montoAdjudicado across the detail rows', () => {
        mockRepo.getById = jest.fn().mockReturnValue(of(buildNoObjecion({
            detalles: [
                { itemMlId: 1, cantidad: 10, precioAdjudicado: 10, montoAdjudicado: 300, rucProveedor: '1', razonSocialProveedor: 'A', tipoItemRef: 1 },
                { itemMlId: 2, cantidad: 5, precioAdjudicado: 40, montoAdjudicado: 200, rucProveedor: '2', razonSocialProveedor: 'B', tipoItemRef: 2 }
            ]
        })));
        fixture.detectChanges();

        expect(component.total()).toBe(500);
    });

    it('should label tipoItemRef 2 as Servicio and anything else as Bien', () => {
        expect(component.tipoItemLabel(2)).toBe('Servicio');
        expect(component.tipoItemLabel(1)).toBe('Bien');
    });

    it('should stop loading when the request fails', () => {
        mockRepo.getById = jest.fn().mockReturnValue(of(null as unknown as NoObjecion));
        fixture.detectChanges();

        expect(component.loading()).toBe(false);
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

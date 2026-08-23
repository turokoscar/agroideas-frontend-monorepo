import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AlertService } from '@agroideas/feedback';
import { DesembolsoModalComponent } from './desembolso-modal.component';
import { DesembolsoRepository } from '../../../domain/repositories/desembolso.repository';
import { NoObjecionRepository } from '../../../domain/repositories/no-objecion.repository';
import { CatalogoRepository } from '../../../domain/repositories/catalogo.repository';
import { ConvenioStateService } from '../../../shared/services/convenio-state.service';

describe('DesembolsoModalComponent', () => {
    let component: DesembolsoModalComponent;
    let fixture: ComponentFixture<DesembolsoModalComponent>;
    let mockDesembolsoRepo: jest.Mocked<Partial<DesembolsoRepository>>;
    let mockNoObjecionRepo: jest.Mocked<Partial<NoObjecionRepository>>;
    let mockCatalogoRepo: jest.Mocked<Partial<CatalogoRepository>>;
    let mockStateService: jest.Mocked<Partial<ConvenioStateService>>;
    let mockAlert: jest.Mocked<Partial<AlertService>>;

    const itemDisponible = {
        id: 1,
        idTipoItem: 1,
        noObjecionCodigo: 'NO-001',
        proveedorNombre: 'Proveedor SAC',
        itemNombre: 'Fertilizante',
        montoAdjudicado: 1000,
        saldoDisponible: 400
    };

    const otroItemDisponible = {
        id: 2,
        idTipoItem: 1,
        noObjecionCodigo: 'NO-002',
        proveedorNombre: 'Otro Proveedor SAC',
        itemNombre: 'Semillas',
        montoAdjudicado: 500,
        saldoDisponible: 250
    };

    /** Añade una fila vacía y simula la selección de `item` en ella, como haría el usuario en el dropdown de la fila. */
    const addAndSelectItem = (item: { id: number }) => {
        component.addItem();
        const index = component.itemsFormArray.length - 1;
        component.itemsFormArray.at(index).get('itemAdjudicadoId')?.setValue(item.id);
        component.onItemChange(index);
        return index;
    };

    beforeEach(async () => {
        mockDesembolsoRepo = { registrar: jest.fn() };
        mockNoObjecionRepo = { getItemsParaDesembolso: jest.fn().mockReturnValue(of([itemDisponible, otroItemDisponible])) };
        mockCatalogoRepo = { getByGrupo: jest.fn().mockReturnValue(of([])) };
        mockStateService = { refresh: jest.fn(), convenio: jest.fn().mockReturnValue(null) as unknown as ConvenioStateService['convenio'] };
        mockAlert = { show: jest.fn(), toast: jest.fn(), showResponse: jest.fn() };

        await TestBed.configureTestingModule({
            imports: [DesembolsoModalComponent],
            providers: [
                { provide: DesembolsoRepository, useValue: mockDesembolsoRepo },
                { provide: NoObjecionRepository, useValue: mockNoObjecionRepo },
                { provide: CatalogoRepository, useValue: mockCatalogoRepo },
                { provide: ConvenioStateService, useValue: mockStateService },
                { provide: AlertService, useValue: mockAlert }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(DesembolsoModalComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('convenioId', 5);
    });

    it('should load the available items and tipos de pago on init', () => {
        fixture.detectChanges();

        expect(mockNoObjecionRepo.getItemsParaDesembolso).toHaveBeenCalledWith(5);
        expect(mockCatalogoRepo.getByGrupo).toHaveBeenCalledWith('TIPO_PAGO');
        expect(component.itemsDisponibles()).toEqual([itemDisponible, otroItemDisponible]);
    });

    it('should filter items by tipo when a filter other than "todos" is set', () => {
        mockNoObjecionRepo.getItemsParaDesembolso = jest.fn().mockReturnValue(
            of([itemDisponible, { ...itemDisponible, id: 2, idTipoItem: 2 }])
        );
        fixture.detectChanges();

        component.filterTipoItem.set(2);
        component.applyFilters();

        expect(component.itemsDisponibles()).toHaveLength(1);
        expect(component.itemsDisponibles()[0].id).toBe(2);
    });

    describe('addItem', () => {
        it('should append an empty row that requires selecting an item', () => {
            fixture.detectChanges();

            component.addItem();

            expect(component.itemsFormArray.length).toBe(1);
            expect(component.itemsFormArray.at(0).get('itemAdjudicadoId')?.value).toBe('');
            expect(component.itemsFormArray.at(0).invalid).toBe(true);
        });
    });

    describe('onItemChange', () => {
        it('should populate the row and default montoSolicitado to the item saldoDisponible', () => {
            fixture.detectChanges();

            addAndSelectItem(itemDisponible);

            const row = component.itemsFormArray.at(0);
            expect(row.get('proveedorNombre')?.value).toBe('Proveedor SAC');
            expect(row.get('montoTotal')?.value).toBe(1000);
            expect(row.get('saldoDisponible')?.value).toBe(400);
            expect(row.get('montoSolicitado')?.value).toBe(400);
        });

        it('should reset montoSolicitado and its max validator when the item is swapped for another', () => {
            fixture.detectChanges();
            addAndSelectItem(itemDisponible);
            component.itemsFormArray.at(0).get('montoSolicitado')?.setValue(999);

            component.itemsFormArray.at(0).get('itemAdjudicadoId')?.setValue(otroItemDisponible.id);
            component.onItemChange(0);

            const row = component.itemsFormArray.at(0);
            expect(row.get('montoSolicitado')?.value).toBe(250);
            row.get('montoSolicitado')?.setValue(251);
            expect(row.get('montoSolicitado')?.hasError('max')).toBe(true);
        });
    });

    describe('getAvailableItems', () => {
        it('should exclude items already selected in other rows', () => {
            fixture.detectChanges();
            addAndSelectItem(itemDisponible);
            component.addItem();

            const optionsForSecondRow = component.getAvailableItems(1);

            expect(optionsForSecondRow.find(i => i.id === itemDisponible.id)).toBeUndefined();
            expect(optionsForSecondRow.find(i => i.id === otroItemDisponible.id)).toBeDefined();
        });

        it('should keep the currently selected item available for its own row', () => {
            fixture.detectChanges();
            addAndSelectItem(itemDisponible);

            const optionsForFirstRow = component.getAvailableItems(0);

            expect(optionsForFirstRow.find(i => i.id === itemDisponible.id)).toBeDefined();
        });
    });

    it('should sum montoSolicitado across added items', () => {
        fixture.detectChanges();
        addAndSelectItem(itemDisponible);
        addAndSelectItem(otroItemDisponible);

        expect(component.totalSolicitado()).toBe(650);
    });

    describe('save', () => {
        it('should warn when there are no items and the form is invalid', () => {
            fixture.detectChanges();

            component.save();

            expect(mockAlert.toast).toHaveBeenCalledWith('Debe agregar al menos un ítem a la solicitud.');
            expect(mockDesembolsoRepo.registrar).not.toHaveBeenCalled();
        });

        it('should register the solicitud, refresh state, and close on success', () => {
            fixture.detectChanges();
            component.form.patchValue({ numeroSolicitud: 'SOL-1', tipoPagoId: 2 });
            addAndSelectItem(itemDisponible);
            mockDesembolsoRepo.registrar = jest.fn().mockReturnValue(of({ exitoso: true }));
            let closedWith: boolean | undefined;
            component.onClose.subscribe((v) => (closedWith = v));

            component.save();

            expect(mockDesembolsoRepo.registrar).toHaveBeenCalledWith(
                expect.objectContaining({
                    postulanteId: 5,
                    numeroSolicitud: 'SOL-1',
                    tipoPagoId: 2,
                    items: [expect.objectContaining({ itemAdjudicadoId: 1, montoSolicitado: 400 })]
                })
            );
            expect(mockStateService.refresh).toHaveBeenCalledWith(5);
            expect(mockAlert.toast).toHaveBeenCalledWith('Solicitud de desembolso registrada correctamente.');
            expect(closedWith).toBe(true);
        });

        it('should show the server response when it logically fails', () => {
            fixture.detectChanges();
            component.form.patchValue({ numeroSolicitud: 'SOL-1', tipoPagoId: 2 });
            addAndSelectItem(itemDisponible);
            mockDesembolsoRepo.registrar = jest.fn().mockReturnValue(of({ exitoso: false, mensaje: 'No autorizado' }));

            component.save();

            expect(mockAlert.showResponse).toHaveBeenCalledWith({ exitoso: false, mensaje: 'No autorizado' });
            expect(mockStateService.refresh).not.toHaveBeenCalled();
        });

        it('should extract FluentValidation-style errors from the response body', () => {
            fixture.detectChanges();
            component.form.patchValue({ numeroSolicitud: 'SOL-1', tipoPagoId: 2 });
            addAndSelectItem(itemDisponible);
            mockDesembolsoRepo.registrar = jest.fn().mockReturnValue(
                throwError(() => ({ error: { errors: { NumeroSolicitud: ['Ya existe'] } } }))
            );

            component.save();

            expect(mockAlert.show).toHaveBeenCalledWith('Error', 'Ya existe', 'error');
        });
    });
});

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

    beforeEach(async () => {
        mockDesembolsoRepo = { registrar: jest.fn() };
        mockNoObjecionRepo = { getItemsParaDesembolso: jest.fn().mockReturnValue(of([itemDisponible])) };
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
        expect(component.itemsDisponibles()).toEqual([itemDisponible]);
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
        it('should do nothing without a selected item', () => {
            fixture.detectChanges();

            component.addItem();

            expect(component.itemsFormArray.length).toBe(0);
        });

        it('should add the selected item, defaulting montoSolicitado to its saldoDisponible', () => {
            fixture.detectChanges();
            component.selectedItemToAdd.set(itemDisponible);

            component.addItem();

            expect(component.itemsFormArray.length).toBe(1);
            expect(component.itemsFormArray.at(0).get('montoSolicitado')?.value).toBe(400);
            expect(component.selectedItemToAdd()).toBeNull();
        });

        it('should reject adding the same item twice', () => {
            fixture.detectChanges();
            component.selectedItemToAdd.set(itemDisponible);
            component.addItem();
            component.selectedItemToAdd.set(itemDisponible);

            component.addItem();

            expect(component.itemsFormArray.length).toBe(1);
            expect(mockAlert.toast).toHaveBeenCalledWith('Este ítem ya ha sido agregado a la solicitud.');
        });
    });

    it('should sum montoSolicitado across added items', () => {
        fixture.detectChanges();
        component.selectedItemToAdd.set(itemDisponible);
        component.addItem();
        component.selectedItemToAdd.set({ ...itemDisponible, id: 2, saldoDisponible: 250 });
        component.addItem();

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
            component.selectedItemToAdd.set(itemDisponible);
            component.addItem();
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
            component.selectedItemToAdd.set(itemDisponible);
            component.addItem();
            mockDesembolsoRepo.registrar = jest.fn().mockReturnValue(of({ exitoso: false, mensaje: 'No autorizado' }));

            component.save();

            expect(mockAlert.showResponse).toHaveBeenCalledWith({ exitoso: false, mensaje: 'No autorizado' });
            expect(mockStateService.refresh).not.toHaveBeenCalled();
        });

        it('should extract FluentValidation-style errors from the response body', () => {
            fixture.detectChanges();
            component.form.patchValue({ numeroSolicitud: 'SOL-1', tipoPagoId: 2 });
            component.selectedItemToAdd.set(itemDisponible);
            component.addItem();
            mockDesembolsoRepo.registrar = jest.fn().mockReturnValue(
                throwError(() => ({ error: { errors: { NumeroSolicitud: ['Ya existe'] } } }))
            );

            component.save();

            expect(mockAlert.show).toHaveBeenCalledWith('Error', 'Ya existe', 'error');
        });
    });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AlertService } from '@agroideas/feedback';
import { RendicionPageComponent } from './rendicion.page';
import { RendicionRepository } from '../../../domain/repositories/rendicion.repository';
import { CatalogoRepository } from '../../../domain/repositories/catalogo.repository';

describe('RendicionPageComponent', () => {
    let component: RendicionPageComponent;
    let fixture: ComponentFixture<RendicionPageComponent>;
    let mockRendicionRepo: jest.Mocked<Partial<RendicionRepository>>;
    let mockCatalogoRepo: jest.Mocked<Partial<CatalogoRepository>>;
    let mockAlert: jest.Mocked<Partial<AlertService>>;

    beforeEach(async () => {
        mockRendicionRepo = {
            getByConvenio: jest.fn().mockReturnValue(of({ items: [], total: 0 })),
            delete: jest.fn()
        };
        mockCatalogoRepo = { getByGrupo: jest.fn().mockReturnValue(of([])) };
        mockAlert = { confirm: jest.fn(), toast: jest.fn(), show: jest.fn() };

        await TestBed.configureTestingModule({
            imports: [RendicionPageComponent],
            providers: [
                { provide: RendicionRepository, useValue: mockRendicionRepo },
                { provide: CatalogoRepository, useValue: mockCatalogoRepo },
                { provide: AlertService, useValue: mockAlert }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(RendicionPageComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('convenioId', 5);
    });

    it('should load the SUNAT_CPE catalog and the rendiciones for the convenio on init', () => {
        fixture.detectChanges();

        expect(mockCatalogoRepo.getByGrupo).toHaveBeenCalledWith('SUNAT_CPE');
        expect(mockRendicionRepo.getByConvenio).toHaveBeenCalledWith(5, 0, 10, undefined, undefined);
    });

    it('should not query when convenioId resolves to 0', () => {
        fixture.componentRef.setInput('convenioId', 0);
        fixture.detectChanges();

        expect(mockRendicionRepo.getByConvenio).not.toHaveBeenCalled();
    });

    it('should update offset/limit from the lazy-load event before reloading', () => {
        fixture.detectChanges();
        component.loadLazyRendiciones({ first: 20, rows: 5 });

        expect(mockRendicionRepo.getByConvenio).toHaveBeenLastCalledWith(5, 20, 5, undefined, undefined);
    });

    it('should reset the offset to 0 on search', () => {
        fixture.detectChanges();
        component.offset.set(30);

        component.onSearch();

        expect(component.offset()).toBe(0);
        expect(mockRendicionRepo.getByConvenio).toHaveBeenLastCalledWith(5, 0, 10, undefined, undefined);
    });

    it('should open the modal in create mode with no selection', () => {
        component.openModal();

        expect(component.showModal()).toBe(true);
        expect(component.selectedRendicion()).toBeNull();
    });

    it('should not delete when the confirmation is dismissed', async () => {
        mockAlert.confirm = jest.fn().mockResolvedValue({ isConfirmed: false });

        await component.deleteRendicion(1);

        expect(mockRendicionRepo.delete).not.toHaveBeenCalled();
    });

    it('should delete, toast, and reload when the confirmation is accepted', async () => {
        mockAlert.confirm = jest.fn().mockResolvedValue({ isConfirmed: true });
        mockRendicionRepo.delete = jest.fn().mockReturnValue(of(null));
        fixture.detectChanges();

        await component.deleteRendicion(1);

        expect(mockRendicionRepo.delete).toHaveBeenCalledWith(1);
        expect(mockAlert.toast).toHaveBeenCalledWith('Rendición anulada');
        expect(mockRendicionRepo.getByConvenio).toHaveBeenCalled();
    });

    it('should close the modal and reload on success', () => {
        fixture.detectChanges();
        component.showModal.set(true);
        component.selectedRendicion.set({ id: 1 } as any);

        component.onRendicionSuccess();

        expect(component.showModal()).toBe(false);
        expect(component.selectedRendicion()).toBeNull();
    });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AlertService } from '@agroideas/feedback';
import { NoObjecionPageComponent } from './no-objecion.page';
import { NoObjecionRepository } from '../../../domain/repositories/no-objecion.repository';
import { NoObjecion } from '../../../domain/models/no-objecion.model';

describe('NoObjecionPageComponent', () => {
    let component: NoObjecionPageComponent;
    let fixture: ComponentFixture<NoObjecionPageComponent>;
    let mockRepo: jest.Mocked<Partial<NoObjecionRepository>>;
    let mockAlert: jest.Mocked<Partial<AlertService>>;

    const buildNoObjecion = (overrides: Partial<NoObjecion> = {}): NoObjecion => ({
        id: 1,
        tipoDocumentoId: 1,
        numeroDocumento: '12',
        fechaDocumento: '2026-06-01',
        postulanteId: 5,
        detalles: [],
        numSolicitudes: 0,
        ...overrides
    });

    beforeEach(async () => {
        mockRepo = {
            getByPostulante: jest.fn().mockReturnValue(of({ items: [], total: 0 })),
            delete: jest.fn(),
            downloadFile: jest.fn()
        };
        mockAlert = { show: jest.fn(), toast: jest.fn(), confirm: jest.fn() };

        await TestBed.configureTestingModule({
            imports: [NoObjecionPageComponent],
            providers: [
                { provide: NoObjecionRepository, useValue: mockRepo },
                { provide: AlertService, useValue: mockAlert }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(NoObjecionPageComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('convenioId', 5);
    });

    it('should load the no-objeciones for the convenio on init', () => {
        fixture.detectChanges();

        expect(mockRepo.getByPostulante).toHaveBeenCalledWith(5, 0, 10, '', '', '');
    });

    it('should not query when convenioId resolves to 0', () => {
        fixture.componentRef.setInput('convenioId', 0);
        fixture.detectChanges();

        expect(mockRepo.getByPostulante).not.toHaveBeenCalled();
    });

    describe('formatDocNumber', () => {
        it('should pad a bare number and append the year', () => {
            expect(component.formatDocNumber('7', '2025-06-01')).toBe('0007-2025');
        });

        it('should pass through a number with a dash unchanged', () => {
            expect(component.formatDocNumber('0007-2025', null)).toBe('0007-2025');
        });
    });

    describe('editNoObjecion', () => {
        it('should block editing a no-objecion that already has desembolsos', () => {
            fixture.detectChanges();
            component.noObjeciones.set([buildNoObjecion({ id: 1, numSolicitudes: 2 })]);

            component.editNoObjecion(1);

            expect(component.showModal()).toBe(false);
            expect(mockAlert.show).toHaveBeenCalledWith('Acción no permitida', expect.any(String), 'warning');
        });

        it('should open the edit modal when there are no desembolsos', () => {
            fixture.detectChanges();
            component.noObjeciones.set([buildNoObjecion({ id: 1, numSolicitudes: 0 })]);

            component.editNoObjecion(1);

            expect(component.showModal()).toBe(true);
            expect(component.modalMode()).toBe('edit');
            expect(component.selectedNoObjecionId()).toBe(1);
        });
    });

    describe('viewNoObjecion', () => {
        it('should open the lightweight items modal without touching the registration modal', () => {
            fixture.detectChanges();

            component.viewNoObjecion(1);

            expect(component.showItemsModal()).toBe(true);
            expect(component.viewingNoObjecionId()).toBe(1);
            expect(component.showModal()).toBe(false);
        });

        it('should close the items modal without reloading the list', () => {
            fixture.detectChanges();
            component.viewNoObjecion(1);
            jest.clearAllMocks();

            component.handleItemsModalClose();

            expect(component.showItemsModal()).toBe(false);
            expect(mockRepo.getByPostulante).not.toHaveBeenCalled();
        });
    });

    describe('deleteNoObjecion', () => {
        it('should block deleting a no-objecion that already has desembolsos', () => {
            fixture.detectChanges();
            component.noObjeciones.set([buildNoObjecion({ id: 1, numSolicitudes: 1 })]);

            component.deleteNoObjecion(1);

            expect(mockAlert.confirm).not.toHaveBeenCalled();
            expect(mockAlert.show).toHaveBeenCalledWith('Acción no permitida', expect.any(String), 'warning');
        });

        it('should delete and reload when confirmed', async () => {
            fixture.detectChanges();
            component.noObjeciones.set([buildNoObjecion({ id: 1, numSolicitudes: 0 })]);
            mockAlert.confirm = jest.fn().mockResolvedValue({ isConfirmed: true });
            mockRepo.delete = jest.fn().mockReturnValue(of(null));

            component.deleteNoObjecion(1);
            await Promise.resolve();

            expect(mockRepo.delete).toHaveBeenCalledWith(1);
            expect(mockAlert.toast).toHaveBeenCalledWith('No Objeción eliminada con éxito.');
        });
    });

    it('should warn instead of downloading when there is no file url', () => {
        component.downloadDocument('');

        expect(mockRepo.downloadFile).not.toHaveBeenCalled();
        expect(mockAlert.show).toHaveBeenCalledWith('Información', expect.any(String), 'info');
    });
});

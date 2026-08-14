import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AlertService } from '@agroideas/feedback';
import { BandejaAprobacionPageComponent } from './bandeja-aprobacion.page';
import { NoObjecionRepository } from '../../../domain/repositories/no-objecion.repository';

describe('BandejaAprobacionPageComponent', () => {
    let component: BandejaAprobacionPageComponent;
    let fixture: ComponentFixture<BandejaAprobacionPageComponent>;
    let mockRepo: jest.Mocked<Partial<NoObjecionRepository>>;
    let mockAlert: jest.Mocked<Partial<AlertService>>;

    beforeEach(async () => {
        mockRepo = {
            getBandejaAprobacion: jest.fn().mockReturnValue(of({ items: [], total: 0 })),
            downloadFile: jest.fn(),
            evaluar: jest.fn()
        };
        mockAlert = { show: jest.fn(), toast: jest.fn(), confirm: jest.fn() };

        await TestBed.configureTestingModule({
            imports: [BandejaAprobacionPageComponent],
            providers: [
                { provide: NoObjecionRepository, useValue: mockRepo },
                { provide: AlertService, useValue: mockAlert }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(BandejaAprobacionPageComponent);
        component = fixture.componentInstance;
    });

    it('should load the PENDIENTE tab on init', () => {
        fixture.detectChanges();

        expect(mockRepo.getBandejaAprobacion).toHaveBeenCalledWith('PENDIENTE', 0, 10);
    });

    it('should switch tabs and reload', () => {
        fixture.detectChanges();

        component.setTab('APROBADO');

        expect(component.activeTab()).toBe('APROBADO');
        expect(mockRepo.getBandejaAprobacion).toHaveBeenLastCalledWith('APROBADO', 0, 10);
    });

    describe('formatDocNumber', () => {
        it('should return empty for a missing number', () => {
            expect(component.formatDocNumber('', '2026-01-01')).toBe('');
        });

        it('should pass through a number that already has a dash', () => {
            expect(component.formatDocNumber('0012-2026', '2026-01-01')).toBe('0012-2026');
        });

        it('should pad a bare number and append the year of the given date', () => {
            expect(component.formatDocNumber('12', '2025-06-01')).toBe('0012-2025');
        });

        it('should fall back to the current year when no date is given', () => {
            const currentYear = new Date().getFullYear();
            expect(component.formatDocNumber('7', null)).toBe(`0007-${currentYear}`);
        });

        it('should return the raw value when it is not parseable as a number', () => {
            expect(component.formatDocNumber('ABC', '2026-01-01')).toBe('ABC');
        });
    });

    describe('procesarEvaluacion', () => {
        beforeEach(() => {
            fixture.detectChanges();
            component.selectedItem.set({ id: 9, numeroNoObjecion: '0009-2026' });
        });

        it('should require an observacion before confirming', () => {
            component.observacionSupervisor.set('   ');

            component.procesarEvaluacion('APROBADO');

            expect(mockAlert.confirm).not.toHaveBeenCalled();
            expect(mockAlert.toast).toHaveBeenCalledWith('Debe ingresar un sustento u observación obligatoriamente.', 'warning');
        });

        it('should do nothing without a selected item', () => {
            component.selectedItem.set(null);
            component.observacionSupervisor.set('Todo en orden');

            component.procesarEvaluacion('APROBADO');

            expect(mockAlert.confirm).not.toHaveBeenCalled();
        });

        it('should skip the API call when the confirmation is dismissed', async () => {
            component.observacionSupervisor.set('Todo en orden');
            mockAlert.confirm = jest.fn().mockResolvedValue({ isConfirmed: false });

            component.procesarEvaluacion('APROBADO');
            await Promise.resolve();

            expect(mockRepo.evaluar).not.toHaveBeenCalled();
        });

        it('should evaluate, close the modal, and reload when confirmed', async () => {
            component.observacionSupervisor.set('Todo en orden');
            component.showEvalModal.set(true);
            mockAlert.confirm = jest.fn().mockResolvedValue({ isConfirmed: true });
            mockRepo.evaluar = jest.fn().mockReturnValue(of({ mensaje: 'OK' }));

            component.procesarEvaluacion('APROBADO');
            await Promise.resolve();

            expect(mockRepo.evaluar).toHaveBeenCalledWith(9, 'APROBADO', 'Todo en orden');
            expect(component.showEvalModal()).toBe(false);
            expect(component.isSubmitting()).toBe(false);
        });
    });

    it('should warn instead of downloading when there is no attached file', () => {
        component.downloadEvidencia({ archivoUrl: '' });

        expect(mockRepo.downloadFile).not.toHaveBeenCalled();
        expect(mockAlert.show).toHaveBeenCalledWith('Información', expect.any(String), 'info');
    });
});

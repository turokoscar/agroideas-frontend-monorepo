import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AlertService } from '@agroideas/feedback';
import { ProgramacionCronogramaModalComponent } from './programacion-cronograma-modal.component';
import { ProgramacionRepository } from '../../../domain/repositories/programacion.repository';
import { ProgramacionItem } from '../../../domain/models/programacion.model';

describe('ProgramacionCronogramaModalComponent', () => {
    let component: ProgramacionCronogramaModalComponent;
    let fixture: ComponentFixture<ProgramacionCronogramaModalComponent>;
    let mockRepo: jest.Mocked<Partial<ProgramacionRepository>>;
    let mockAlert: jest.Mocked<Partial<AlertService>>;

    const buildItem = (overrides: Partial<ProgramacionItem> = {}): ProgramacionItem => ({
        id: 1,
        postulanteID: 5,
        item: 'Fertilizante',
        metaAprobada: 100,
        metaFisica: 100,
        montoAprobado: 1000,
        metaFinanciera: 1000,
        ...overrides
    });

    const createComponent = (item = buildItem(), fechaInicio = '2026-01-15', fechaFin = '2026-12-15') => {
        fixture = TestBed.createComponent(ProgramacionCronogramaModalComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('item', item);
        fixture.componentRef.setInput('fechaInicio', fechaInicio);
        fixture.componentRef.setInput('fechaFin', fechaFin);
        return fixture;
    };

    beforeEach(async () => {
        mockRepo = { getCronograma: jest.fn().mockReturnValue(of([])), saveCronograma: jest.fn() };
        mockAlert = { show: jest.fn(), toast: jest.fn(), showResponse: jest.fn() };

        await TestBed.configureTestingModule({
            imports: [ProgramacionCronogramaModalComponent],
            providers: [
                { provide: ProgramacionRepository, useValue: mockRepo },
                { provide: AlertService, useValue: mockAlert }
            ]
        }).compileComponents();
    });

    describe('initCronograma', () => {
        it('should build one row per month spanning fechaInicio to fechaFin', () => {
            createComponent(buildItem(), '2026-01-15', '2026-12-15').detectChanges();

            expect(component.meses()).toHaveLength(12);
            expect(component.meses()[0].mes).toBe(1);
        });

        it('should clamp to a maximum of 36 months', () => {
            createComponent(buildItem(), '2026-01-15', '2031-06-15').detectChanges();

            expect(component.meses()).toHaveLength(36);
        });

        it('should clamp to a minimum of 1 month when fechaFin precedes fechaInicio', () => {
            createComponent(buildItem(), '2026-06-15', '2026-01-15').detectChanges();

            expect(component.meses()).toHaveLength(1);
        });
    });

    it('should merge the backend cronograma into the initialized meses array', () => {
        mockRepo.getCronograma = jest.fn().mockReturnValue(of([{ mes: 2, metaFisica: 10, metaFinanciera: 100 }]));

        createComponent(buildItem(), '2026-01-15', '2026-12-15').detectChanges();

        const mes2 = component.meses().find((m) => m.mes === 2);
        expect(mes2?.metaFisica).toBe(10);
        expect(mes2?.metaFinanciera).toBe(100);
    });

    describe('computed totals', () => {
        it('should compute restante fisico/financiero against the aprobado meta, falling back when metaAprobada is absent', () => {
            createComponent(buildItem({ metaAprobada: undefined, metaFisica: 50, montoAprobado: undefined, metaFinanciera: 500 }), '2026-01-15', '2026-12-15').detectChanges();

            expect(component.restanteFisico()).toBe(50);
            expect(component.restanteFinanciero()).toBe(500);
        });

        it('should compute agroideasPrecioUnitario as montoAprobado / metaAprobada', () => {
            createComponent(buildItem({ metaAprobada: 100, montoAprobado: 2000 }), '2026-01-15', '2026-12-15').detectChanges();

            expect(component.agroideasPrecioUnitario()).toBe(20);
        });

        it('should report 0 for agroideasPrecioUnitario when the meta is 0', () => {
            createComponent(buildItem({ metaAprobada: 0, metaFisica: 0 }), '2026-01-15', '2026-12-15').detectChanges();

            expect(component.agroideasPrecioUnitario()).toBe(0);
        });
    });

    describe('onFisicaChange', () => {
        it('should set metaFisica and compute a proportional metaFinanciera', () => {
            createComponent(buildItem({ metaAprobada: 100, montoAprobado: 1000 }), '2026-01-15', '2026-12-15').detectChanges();
            const mes = component.meses()[0];

            component.onFisicaChange(mes, 25);

            const updated = component.meses().find((m) => m.mes === mes.mes);
            expect(updated?.metaFisica).toBe(25);
            expect(updated?.metaFinanciera).toBe(250); // 25/100 * 1000
        });
    });

    describe('canSave', () => {
        it('should be false until the total financiero matches montoAprobado', () => {
            createComponent(buildItem({ metaAprobada: 100, montoAprobado: 1000 }), '2026-01-15', '2026-12-15').detectChanges();
            component.onFisicaChange(component.meses()[0], 50); // 500 of 1000

            expect(component.canSave()).toBe(false);
        });

        it('should be true once the total financiero matches montoAprobado within tolerance', () => {
            createComponent(buildItem({ metaAprobada: 100, montoAprobado: 1000 }), '2026-01-15', '2026-12-15').detectChanges();
            component.onFisicaChange(component.meses()[0], 100); // 1000 of 1000

            expect(component.canSave()).toBe(true);
        });
    });

    describe('save', () => {
        it('should block saving when the fisica total exceeds the item meta', () => {
            createComponent(buildItem({ metaAprobada: 100, metaFisica: 100, montoAprobado: 1000 }), '2026-01-15', '2026-12-15').detectChanges();
            component.meses.update((arr) => arr.map((m, i) => (i === 0 ? { ...m, metaFisica: 150, metaFinanciera: 100 } : m)));

            component.save();

            expect(mockAlert.show).toHaveBeenCalledWith('Límite Excedido', expect.stringContaining('meta física'), 'warning');
            expect(mockRepo.saveCronograma).not.toHaveBeenCalled();
        });

        it('should block saving when the financiero total exceeds montoAprobado', () => {
            createComponent(buildItem({ metaAprobada: 100, metaFisica: 100, montoAprobado: 1000 }), '2026-01-15', '2026-12-15').detectChanges();
            component.meses.update((arr) => arr.map((m, i) => (i === 0 ? { ...m, metaFisica: 50, metaFinanciera: 1500 } : m)));

            component.save();

            expect(mockAlert.show).toHaveBeenCalledWith('Límite Excedido', expect.stringContaining('aporte de AGROIDEAS'), 'warning');
            expect(mockRepo.saveCronograma).not.toHaveBeenCalled();
        });

        it('should submit only the months with metaFisica > 0, then emit saved and hide', () => {
            createComponent(buildItem({ metaAprobada: 100, metaFisica: 100, montoAprobado: 1000, postulanteID: 7 }), '2026-01-15', '2026-12-15').detectChanges();
            component.onFisicaChange(component.meses()[0], 100);
            mockRepo.saveCronograma = jest.fn().mockReturnValue(of({ exitoso: true }));
            let savedEmitted = false;
            component.saved.subscribe(() => (savedEmitted = true));

            component.save();

            expect(mockRepo.saveCronograma).toHaveBeenCalledWith({
                marcoLogicoId: 1,
                postulanteId: 7,
                detalles: [{ mes: 1, metaFisica: 100, metaFinanciera: 1000 }]
            });
            expect(savedEmitted).toBe(true);
            expect(component.visible()).toBe(false);
        });

        it('should show the server response and keep saving false when it logically fails', () => {
            createComponent(buildItem({ metaAprobada: 100, metaFisica: 100, montoAprobado: 1000 }), '2026-01-15', '2026-12-15').detectChanges();
            component.onFisicaChange(component.meses()[0], 100);
            mockRepo.saveCronograma = jest.fn().mockReturnValue(of({ exitoso: false, mensaje: 'Error de negocio' }));

            component.save();

            expect(mockAlert.showResponse).toHaveBeenCalledWith({ exitoso: false, mensaje: 'Error de negocio' });
            expect(component.saving()).toBe(false);
        });
    });
});

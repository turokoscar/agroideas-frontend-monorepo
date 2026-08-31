import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { AlertService } from '@agroideas/feedback';
import { CarteraPageComponent } from './cartera.page';
import { CarteraRepository } from '../../../domain/repositories/cartera.repository';
import { CarteraItem } from '../../../domain/models/cartera.model';

describe('CarteraPageComponent', () => {
    let component: CarteraPageComponent;
    let fixture: ComponentFixture<CarteraPageComponent>;
    let mockRepo: jest.Mocked<Partial<CarteraRepository>>;
    let mockAlert: jest.Mocked<Partial<AlertService>>;
    let router: Router;

    const buildItem = (overrides: Partial<CarteraItem> = {}): CarteraItem => ({
        postulanteId: 1,
        nroRuc: '20100000001',
        razonSocial: 'Asociación',
        email: 'ana@test.com',
        numeroConvenio: '12',
        periodo: 2026,
        duracion: 12,
        fechaFirma: '2026-01-01',
        fechaFin: '2026-12-31',
        region: 'Cusco',
        estadoSituacional: 'Activo',
        montoAprobado: 1000,
        montoProgramado: 500,
        montoEjecutado: 400,
        ejecucionAcumulada: 400,
        saldoPorProgramar: 500,
        saldoPorEjecutar: 600,
        saldo: 600,
        asignadoA: 'Juan Pérez',
        ...overrides
    });

    beforeEach(async () => {
        mockRepo = {
            getCartera: jest.fn().mockReturnValue(of({ items: [], total: 0 })),
            getEspecialistas: jest.fn().mockReturnValue(of([])),
            reasignar: jest.fn()
        };
        mockAlert = { show: jest.fn() };

        await TestBed.configureTestingModule({
            imports: [CarteraPageComponent],
            providers: [
                provideRouter([]),
                { provide: CarteraRepository, useValue: mockRepo },
                { provide: AlertService, useValue: mockAlert }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(CarteraPageComponent);
        component = fixture.componentInstance;
        router = TestBed.inject(Router);
        jest.spyOn(router, 'navigate').mockResolvedValue(true);
    });

    it('should load the cartera and the especialistas list on init', () => {
        fixture.detectChanges();

        expect(mockRepo.getCartera).toHaveBeenCalledWith('', 0, 10);
        expect(mockRepo.getEspecialistas).toHaveBeenCalled();
    });

    it('should require an especialista before confirming a reassignment', () => {
        fixture.detectChanges();
        component.reasignItem.set(buildItem());
        component.selectedEspecialistaId.set(null);

        component.confirmarReasignar();

        expect(mockRepo.reasignar).not.toHaveBeenCalled();
        expect(mockAlert.show).toHaveBeenCalledWith('Error', 'Debe seleccionar un especialista.', 'error');
    });

    it('should reasignar, close the modal, and reload on success', () => {
        fixture.detectChanges();
        component.reasignItem.set(buildItem({ postulanteId: 7 }));
        component.selectedEspecialistaId.set(3);
        component.observacion.set('Cambio de zona');
        component.showReasignModal.set(true);
        mockRepo.reasignar = jest.fn().mockReturnValue(of({ exitoso: true, mensaje: '' }));

        component.confirmarReasignar();

        expect(mockRepo.reasignar).toHaveBeenCalledWith({ postulanteId: 7, nuevoEspecialistaId: 3, observacion: 'Cambio de zona' });
        expect(component.showReasignModal()).toBe(false);
        expect(mockAlert.show).toHaveBeenCalledWith('Éxito', expect.any(String), 'success');
    });

    it('should show the server error message when reasignar fails logically', () => {
        fixture.detectChanges();
        component.reasignItem.set(buildItem());
        component.selectedEspecialistaId.set(3);
        mockRepo.reasignar = jest.fn().mockReturnValue(of({ exitoso: false, mensaje: 'Especialista inactivo' }));

        component.confirmarReasignar();

        expect(mockAlert.show).toHaveBeenCalledWith('Error', 'Especialista inactivo', 'error');
    });

    it('should format the convenio number padded with periodo and -ST suffix', () => {
        expect(component.formatConvenioNumber(buildItem({ numeroConvenio: '12', periodo: 2026 }))).toBe('0012-2026-ST');
        expect(component.formatConvenioNumber(buildItem({ numeroConvenio: '' }))).toBe('-');
    });

    it('should classify saldo color by remaining percentage', () => {
        expect(component.getSaldoColor(buildItem({ saldo: 100, montoAprobado: 1000 }))).toBe('text-red-600');
        expect(component.getSaldoColor(buildItem({ saldo: 300, montoAprobado: 1000 }))).toBe('text-yellow-600');
        expect(component.getSaldoColor(buildItem({ saldo: 800, montoAprobado: 1000 }))).toBe('text-green-600');
    });

    it('should classify the estado semaforo by execution percentage', () => {
        expect(component.getEstadoSemaforo(buildItem({ ejecucionAcumulada: 950, montoAprobado: 1000 }))).toEqual({ status: 'Activo', text: 'En ejecución' });
        expect(component.getEstadoSemaforo(buildItem({ ejecucionAcumulada: 0, montoAprobado: 1000 }))).toEqual({ status: 'Crítica', text: 'Sin ejecutar' });
    });

    it('should classify the estado variant by keyword, case-insensitively', () => {
        expect(component.getEstadoVariant('VIGENTE')).toBe('Activo');
        expect(component.getEstadoVariant('Suspendido')).toBe('Suspendido');
        expect(component.getEstadoVariant('Concluido')).toBe('Finalizado');
        expect(component.getEstadoVariant('otro')).toBe('Media');
    });

    it('should title-case the estado text, defaulting an empty value', () => {
        expect(component.getEstadoText('ACTIVO')).toBe('Activo');
        expect(component.getEstadoText('')).toBe('Sin estado');
    });
});

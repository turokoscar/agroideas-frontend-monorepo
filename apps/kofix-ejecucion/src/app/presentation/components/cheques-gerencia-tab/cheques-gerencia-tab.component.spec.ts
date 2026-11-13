import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AlertService } from '@agroideas/feedback';
import { ChequesGerenciaTabComponent } from './cheques-gerencia-tab.component';
import { DesembolsoRepository } from '../../../domain/repositories/desembolso.repository';
import { DesembolsoChequePendiente } from '../../../domain/models/desembolso.model';

describe('ChequesGerenciaTabComponent', () => {
    let component: ChequesGerenciaTabComponent;
    let fixture: ComponentFixture<ChequesGerenciaTabComponent>;
    let mockDesembolsoRepo: jest.Mocked<Partial<DesembolsoRepository>>;
    let mockAlert: jest.Mocked<Partial<AlertService>>;

    const buildChequePendiente = (overrides: Partial<DesembolsoChequePendiente> = {}): DesembolsoChequePendiente => ({
        id: 1,
        ideCheque: 1,
        correlativo: 'CH-2202-0001',
        postulanteId: 5,
        numeroSolicitud: '55',
        fechaSolicitud: '2026-11-13',
        itemNombre: 'Asistencia Técnica para el manejo del cultivo de café',
        monto: 500,
        fechaDevengado: '2026-08-26',
        ...overrides
    });

    beforeEach(async () => {
        mockDesembolsoRepo = {
            getChequesPendientesActivacion: jest.fn().mockReturnValue(of([buildChequePendiente()]))
        };
        mockAlert = { show: jest.fn(), toast: jest.fn(), confirm: jest.fn() };

        await TestBed.configureTestingModule({
            imports: [ChequesGerenciaTabComponent],
            providers: [
                { provide: DesembolsoRepository, useValue: mockDesembolsoRepo },
                { provide: AlertService, useValue: mockAlert }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ChequesGerenciaTabComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('convenioId', 5);
    });

    it('carga los cheques pendientes del convenio al iniciar', () => {
        fixture.detectChanges();

        expect(mockDesembolsoRepo.getChequesPendientesActivacion).toHaveBeenCalledWith(5);
        expect(component.chequesPendientes()).toHaveLength(1);
        expect(component.loadError()).toBe(false);
        expect(component.loading()).toBe(false);
    });

    it('no consulta sin convenio', () => {
        fixture.componentRef.setInput('convenioId', 0);
        fixture.detectChanges();

        expect(mockDesembolsoRepo.getChequesPendientesActivacion).not.toHaveBeenCalled();
    });

    it('marca el error de carga en vez de mostrar la bandeja vacía como si no hubiera cheques', () => {
        mockDesembolsoRepo.getChequesPendientesActivacion = jest.fn().mockReturnValue(throwError(() => new Error('500')));
        fixture.detectChanges();

        expect(component.loadError()).toBe(true);
        expect(component.chequesPendientes()).toEqual([]);
        expect(component.loading()).toBe(false);
    });

    it('muestra el N° Memorándum con el formato numero-año de la fecha de la solicitud', () => {
        expect(component.formatSolicitudNumber(buildChequePendiente())).toBe('0055-2026');
        // El año sale de la solicitud, no del devengado
        expect(component.formatSolicitudNumber(buildChequePendiente({ fechaSolicitud: '2025-12-20', fechaDevengado: '2026-01-05' })))
            .toBe('0055-2025');
    });

    it('pinta el N° Memorándum formateado y el ítem del cheque en la tabla', () => {
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('0055-2026');
        expect(fixture.nativeElement.textContent).toContain('Asistencia Técnica para el manejo del cultivo de café');
        expect(component.columns.map(c => c.header)).toContain('Ítem');
    });

    it('abre el modal de activación con el cheque elegido', () => {
        fixture.detectChanges();
        const cheque = buildChequePendiente({ id: 20004 });

        component.abrirActivarChequeModal(cheque);

        expect(component.showActivarChequeModal()).toBe(true);
        expect(component.activandoCheque()).toBe(cheque);
    });

    it('recarga la bandeja al confirmar la activación', () => {
        fixture.detectChanges();
        component.showActivarChequeModal.set(true);
        jest.clearAllMocks();

        component.handleActivarChequeModalClose(true);

        expect(component.showActivarChequeModal()).toBe(false);
        expect(mockDesembolsoRepo.getChequesPendientesActivacion).toHaveBeenCalledWith(5);
    });

    it('no recarga si el modal se cierra sin activar', () => {
        fixture.detectChanges();
        jest.clearAllMocks();

        component.handleActivarChequeModalClose(false);

        expect(mockDesembolsoRepo.getChequesPendientesActivacion).not.toHaveBeenCalled();
    });
});

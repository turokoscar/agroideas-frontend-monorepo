import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AlertService } from '@agroideas/feedback';
import { PermissionService } from '@agroideas/security';
import { DesembolsoPageComponent } from './desembolso.page';
import { DesembolsoRepository } from '../../../domain/repositories/desembolso.repository';
import { CatalogoRepository } from '../../../domain/repositories/catalogo.repository';
import { Desembolso } from '../../../domain/models/desembolso.model';

describe('DesembolsoPageComponent', () => {
    let component: DesembolsoPageComponent;
    let fixture: ComponentFixture<DesembolsoPageComponent>;
    let mockDesembolsoRepo: jest.Mocked<Partial<DesembolsoRepository>>;
    let mockCatalogoRepo: jest.Mocked<Partial<CatalogoRepository>>;
    let mockAlert: jest.Mocked<Partial<AlertService>>;
    let mockPermissionService: jest.Mocked<Partial<PermissionService>>;

    beforeEach(async () => {
        mockDesembolsoRepo = {
            getByPostulante: jest.fn().mockReturnValue(of({ items: [], total: 0 })),
            activarCheque: jest.fn()
        };
        mockCatalogoRepo = { getByGrupo: jest.fn().mockReturnValue(of([])) };
        mockAlert = { confirm: jest.fn(), show: jest.fn() };
        mockPermissionService = { hasPermission: jest.fn().mockReturnValue(false) };

        await TestBed.configureTestingModule({
            imports: [DesembolsoPageComponent],
            providers: [
                { provide: DesembolsoRepository, useValue: mockDesembolsoRepo },
                { provide: CatalogoRepository, useValue: mockCatalogoRepo },
                { provide: AlertService, useValue: mockAlert },
                { provide: PermissionService, useValue: mockPermissionService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(DesembolsoPageComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('convenioId', 5);
    });

    it('should load the TIPO_PAGO catalog and the desembolsos for the convenio on init', () => {
        fixture.detectChanges();

        expect(mockCatalogoRepo.getByGrupo).toHaveBeenCalledWith('TIPO_PAGO');
        expect(mockDesembolsoRepo.getByPostulante).toHaveBeenCalledWith(5, undefined, undefined, undefined, undefined, 0, 10);
    });

    it('should not query when convenioId resolves to 0', () => {
        fixture.componentRef.setInput('convenioId', 0);
        fixture.detectChanges();

        expect(mockDesembolsoRepo.getByPostulante).not.toHaveBeenCalled();
    });

    it('should reflect the ACTIVAR_CHEQUES permission', () => {
        mockPermissionService.hasPermission = jest.fn().mockReturnValue(true);
        fixture.detectChanges();

        expect((component as unknown as { puedeActivarCheque: () => boolean }).puedeActivarCheque()).toBe(true);
    });

    it('should format the numeroSolicitud padded to 4 digits plus the year of fechaSolicitud', () => {
        expect(component.formatSolicitudNumber({ numeroSolicitud: '55', fechaSolicitud: '2026-03-10' } as Desembolso)).toBe('0055-2026');
    });

    it('should show a dash when numeroSolicitud is missing', () => {
        expect(component.formatSolicitudNumber({ fechaSolicitud: '2026-03-10' } as Desembolso)).toBe('-');
    });

    it('should map estado codes to their badge status, defaulting unknown ones to Pendiente', () => {
        expect(component.getBadgeStatus('APROBADO')).toBe('Aprobado');
        expect(component.getBadgeStatus('EN_PROCESO')).toBe('Pendiente');
        expect(component.getBadgeStatus('DESCONOCIDO')).toBe('Pendiente');
    });

    it('should mark a desembolso as Pendiente de Rendir when nothing has been rendered yet', () => {
        expect(component.getEstadoRendicion({ montoTotalDesembolsado: 1000, montoRendido: 0 } as Desembolso))
            .toEqual({ status: 'Pendiente', text: 'Pendiente de Rendir' });
    });

    it('should mark a desembolso as Rendido Parcial when only part of the amount was rendered', () => {
        expect(component.getEstadoRendicion({ montoTotalDesembolsado: 1000, montoRendido: 400 } as Desembolso))
            .toEqual({ status: 'Media', text: 'Rendido Parcial' });
    });

    it('should mark a desembolso as Rendido when the full amount was rendered', () => {
        expect(component.getEstadoRendicion({ montoTotalDesembolsado: 1000, montoRendido: 1000 } as Desembolso))
            .toEqual({ status: 'Aprobado', text: 'Rendido' });
    });

    it('should not activate the cheque when the confirmation is dismissed', async () => {
        mockAlert.confirm = jest.fn().mockResolvedValue({ isConfirmed: false });

        component.activarCheque(1);
        await Promise.resolve();

        expect(mockDesembolsoRepo.activarCheque).not.toHaveBeenCalled();
    });

    it('should activate the cheque and reload when confirmed', async () => {
        fixture.detectChanges();
        mockAlert.confirm = jest.fn().mockResolvedValue({ isConfirmed: true });
        mockDesembolsoRepo.activarCheque = jest.fn().mockReturnValue(of(null));

        component.activarCheque(1);
        await Promise.resolve();

        expect(mockDesembolsoRepo.activarCheque).toHaveBeenCalledWith(1);
        expect(mockAlert.show).toHaveBeenCalledWith('Éxito', expect.any(String), 'success');
    });

    it('should reload the list when the modal closes requesting a refresh', () => {
        fixture.detectChanges();
        component.showModal.set(true);
        jest.clearAllMocks();

        component.handleModalClose(true);

        expect(component.showModal()).toBe(false);
        expect(mockDesembolsoRepo.getByPostulante).toHaveBeenCalled();
    });

    it('should not reload when the modal closes without requesting a refresh', () => {
        fixture.detectChanges();
        jest.clearAllMocks();

        component.handleModalClose(false);

        expect(mockDesembolsoRepo.getByPostulante).not.toHaveBeenCalled();
    });
});

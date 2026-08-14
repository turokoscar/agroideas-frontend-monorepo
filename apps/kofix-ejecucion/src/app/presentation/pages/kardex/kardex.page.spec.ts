import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AlertService } from '@agroideas/feedback';
import { PermissionService } from '@agroideas/security';
import { KardexPageComponent } from './kardex.page';
import { KardexRepository } from '../../../domain/repositories/kardex.repository';
import { DesembolsoRepository } from '../../../domain/repositories/desembolso.repository';

describe('KardexPageComponent', () => {
    let component: KardexPageComponent;
    let fixture: ComponentFixture<KardexPageComponent>;
    let mockKardexRepo: jest.Mocked<Partial<KardexRepository>>;
    let mockDesembolsoRepo: jest.Mocked<Partial<DesembolsoRepository>>;
    let mockAlert: jest.Mocked<Partial<AlertService>>;
    let mockPermissionService: jest.Mocked<Partial<PermissionService>>;

    beforeEach(async () => {
        mockKardexRepo = {
            getCierres: jest.fn().mockReturnValue(of([])),
            getMovimientos: jest.fn().mockReturnValue(of({ items: [], total: 0, summary: { totalMovimientos: 0, totalGastos: 0, totalIngresos: 0 } }))
        };
        mockDesembolsoRepo = { ejecutarCierreContable: jest.fn() };
        mockAlert = { confirm: jest.fn(), show: jest.fn() };
        mockPermissionService = { hasPermission: jest.fn().mockReturnValue(false) };

        await TestBed.configureTestingModule({
            imports: [KardexPageComponent],
            providers: [
                { provide: KardexRepository, useValue: mockKardexRepo },
                { provide: DesembolsoRepository, useValue: mockDesembolsoRepo },
                { provide: AlertService, useValue: mockAlert },
                { provide: PermissionService, useValue: mockPermissionService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(KardexPageComponent);
        component = fixture.componentInstance;
    });

    it('should load the cierres and movimientos on init', () => {
        fixture.detectChanges();

        expect(mockKardexRepo.getCierres).toHaveBeenCalled();
        expect(mockKardexRepo.getMovimientos).toHaveBeenCalledWith('all', 'all', 0, 10);
    });

    describe('proximoMesACerrar', () => {
        it('should default to the current month/year when there is no ultimoCierre', () => {
            fixture.detectChanges();

            const now = new Date();
            expect((component as unknown as { proximoMesACerrar: () => { mes: number; anio: number } }).proximoMesACerrar()).toEqual({ mes: now.getMonth() + 1, anio: now.getFullYear() });
        });

        it('should advance to the next month after the last closed one', () => {
            mockKardexRepo.getCierres = jest.fn().mockReturnValue(of([{ numMes: 5, numAnio: 2026 }]));
            fixture.detectChanges();

            expect((component as unknown as { proximoMesACerrar: () => { mes: number; anio: number } }).proximoMesACerrar()).toEqual({ mes: 6, anio: 2026 });
        });

        it('should roll over into January of the next year after December', () => {
            mockKardexRepo.getCierres = jest.fn().mockReturnValue(of([{ numMes: 12, numAnio: 2026 }]));
            fixture.detectChanges();

            expect((component as unknown as { proximoMesACerrar: () => { mes: number; anio: number } }).proximoMesACerrar()).toEqual({ mes: 1, anio: 2027 });
        });
    });

    it('should classify row/monto CSS by sign', () => {
        expect(component.getRowClass({ monto: 100 } as any)).toBe('kardex-row-income');
        expect(component.getRowClass({ monto: -100 } as any)).toBe('kardex-row-expense');
        expect(component.getRowClass({ monto: 0 } as any)).toBe('kardex-row-neutral');
        expect(component.getMontoClass({ monto: 100 } as any)).toBe('text-success font-bold');
    });

    it('should classify tipo icon/class/label by keyword, case-insensitively', () => {
        expect(component.getTipoIcon('desembolso')).toBe('arrow_upward');
        expect(component.getTipoIcon('Rendición')).toBe('arrow_downward');
        expect(component.getTipoIcon('otro')).toBe('remove');

        expect(component.getTipoClass('DESEMBOLSO')).toBe('text-success');
        expect(component.getTipoClass('DEVOLUCION')).toBe('text-danger');

        expect(component.getTipoNormalized('DESEMBOLSO')).toBe('Desembolso');
        expect(component.getTipoNormalized('EXTORNO')).toBe('Extorno');
        expect(component.getTipoNormalized('GASTO')).toBe('Gasto');
    });

    it('should map estado to its status type, defaulting unknown ones to Pendiente', () => {
        expect(component.getEstadoStatus('Aprobado')).toBe('Aprobado');
        expect(component.getEstadoStatus('Desconocido')).toBe('Pendiente');
    });

    it('should not close the month when the confirmation is dismissed', async () => {
        fixture.detectChanges();
        mockAlert.confirm = jest.fn().mockResolvedValue({ isConfirmed: false });

        component.ejecutarCierreContable();
        await Promise.resolve();

        expect(mockDesembolsoRepo.ejecutarCierreContable).not.toHaveBeenCalled();
    });

    it('should close the proximo mes and reload when confirmed', async () => {
        fixture.detectChanges();
        mockAlert.confirm = jest.fn().mockResolvedValue({ isConfirmed: true });
        mockDesembolsoRepo.ejecutarCierreContable = jest.fn().mockReturnValue(of(null));

        component.ejecutarCierreContable();
        await Promise.resolve();

        const now = new Date();
        expect(mockDesembolsoRepo.ejecutarCierreContable).toHaveBeenCalledWith(now.getMonth() + 1, now.getFullYear());
        expect(mockAlert.show).toHaveBeenCalledWith('Éxito', expect.any(String), 'success');
    });
});

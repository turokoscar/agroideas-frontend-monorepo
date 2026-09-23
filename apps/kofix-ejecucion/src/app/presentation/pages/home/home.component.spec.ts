import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError, Subject } from 'rxjs';
import { AlertService } from '@agroideas/feedback';
import { HomeComponent } from './home.component';
import { ConvenioRepository } from '../../../domain/repositories/convenio.repository';
import { ReporteMensualResponse, ResumenEjecutivo } from '../../../domain/models/convenio.model';

describe('HomeComponent', () => {
    let component: HomeComponent;
    let fixture: ComponentFixture<HomeComponent>;
    let mockRepo: jest.Mocked<Partial<ConvenioRepository>>;
    let mockAlertService: jest.Mocked<Partial<AlertService>>;

    const mockResumen: ResumenEjecutivo = {
        totalConvenios: 5,
        conveniosActivos: 3,
        programacionAcumulada: 1000,
        ejecucionAcumulada: 500,
        saldoDisponible: 500
    };

    beforeEach(async () => {
        mockRepo = {
            getResumenEjecutivo: jest.fn().mockReturnValue(of(mockResumen)),
            getReporteMensual: jest.fn().mockReturnValue(of({ reporte: [{ mes: 1, programado: 100, ejecutado: 50 }] }))
        };

        mockAlertService = {
            toast: jest.fn(),
            show: jest.fn()
        };

        await TestBed.configureTestingModule({
            imports: [HomeComponent],
            providers: [
                { provide: ConvenioRepository, useValue: mockRepo },
                { provide: AlertService, useValue: mockAlertService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(HomeComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        fixture.detectChanges();
        expect(component).toBeTruthy();
    });

    it('should load the resumen ejecutivo and the reporte mensual for the default year on init', () => {
        fixture.detectChanges();

        expect(mockRepo.getResumenEjecutivo).toHaveBeenCalled();
        expect(mockRepo.getReporteMensual).toHaveBeenCalledWith(2026);
        expect(component.resumenData()).toEqual(mockResumen);
        expect(component.chartData()).toEqual([{ mes: 1, programado: 100, ejecutado: 50 }]);
        expect(component.loadingResumen()).toBe(false);
        expect(component.loadingChart()).toBe(false);
        expect(component.errorResumen()).toBeNull();
        expect(component.errorChart()).toBeNull();
    });

    it('should default chartData to an empty list when the API returns no reporte', () => {
        mockRepo.getReporteMensual = jest.fn().mockReturnValue(of({} as unknown as ReporteMensualResponse));
        fixture.detectChanges();

        expect(component.chartData()).toEqual([]);
    });

    it('should turn off loading flags, set error messages and show alert toast when a request errors out', () => {
        mockRepo.getResumenEjecutivo = jest.fn().mockReturnValue(throwError(() => new Error('down')));
        mockRepo.getReporteMensual = jest.fn().mockReturnValue(throwError(() => new Error('down')));

        fixture.detectChanges();

        expect(component.loadingResumen()).toBe(false);
        expect(component.loadingChart()).toBe(false);
        expect(component.errorResumen()).toBe('No se pudieron cargar las métricas del resumen ejecutivo.');
        expect(component.errorChart()).toBe('No se pudo cargar el reporte mensual de ejecución.');
        expect(mockAlertService.toast).toHaveBeenCalledWith('Error al cargar las métricas del resumen ejecutivo', 'error');
        expect(mockAlertService.toast).toHaveBeenCalledWith('Error al cargar el reporte de ejecución mensual', 'error');
    });

    it('should aggregate chartData into a single donutData point', () => {
        mockRepo.getReporteMensual = jest.fn().mockReturnValue(of({
            reporte: [
                { mes: 1, programado: 100, ejecutado: 50 },
                { mes: 2, programado: 200, ejecutado: 150 }
            ]
        }));
        fixture.detectChanges();

        expect(component.donutData()).toEqual({ mes: 0, programado: 300, ejecutado: 200 });
    });

    it('should reload the reporte mensual and cancel the previous request on year change', () => {
        fixture.detectChanges();
        const pending = new Subject<{ reporte: unknown[] }>();
        mockRepo.getReporteMensual = jest.fn().mockReturnValue(pending.asObservable());

        component.onYearChange(2025);

        expect(mockRepo.getReporteMensual).toHaveBeenCalledWith(2025);
        expect(component.selectedYear()).toBe(2025);
        expect(component.loadingChart()).toBe(true);

        pending.next({ reporte: [] });
        expect(component.loadingChart()).toBe(false);
    });

    it('should unsubscribe the chart subscription on destroy', () => {
        fixture.detectChanges();
        const unsubscribeSpy = jest.spyOn(component['chartSubscription'] as { unsubscribe: () => void }, 'unsubscribe');

        component.ngOnDestroy();

        expect(unsubscribeSpy).toHaveBeenCalled();
    });

    it('should retry loading resumen ejecutivo on retryResumen', () => {
        fixture.detectChanges();
        const updatedResumen = { ...mockResumen, totalConvenios: 10 };
        mockRepo.getResumenEjecutivo = jest.fn().mockReturnValue(of(updatedResumen));

        component.retryResumen();

        expect(mockRepo.getResumenEjecutivo).toHaveBeenCalled();
        expect(component.errorResumen()).toBeNull();
        expect(component.resumenData()).toEqual(updatedResumen);
    });

    it('should retry loading reporte mensual on retryChart', () => {
        fixture.detectChanges();
        mockRepo.getReporteMensual = jest.fn().mockReturnValue(of({ reporte: [] }));

        component.retryChart();

        expect(mockRepo.getReporteMensual).toHaveBeenCalledWith(2026);
        expect(component.errorChart()).toBeNull();
        expect(component.chartData()).toEqual([]);
    });
});

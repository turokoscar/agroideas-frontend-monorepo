import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { AlertService } from '@agroideas/feedback';
import { of, throwError } from 'rxjs';
import { ReportesPageComponent } from './reportes.page';
import { GetReporteAvanceMensualUseCase } from '../../../domain/usecases/reporte/get-reporte-avance-mensual.usecase';
import { reporteDePrueba } from '../../components/avance-mensual-table/avance-mensual-table.component.spec';

describe('ReportesPageComponent', () => {
    let component: ReportesPageComponent;
    let fixture: ComponentFixture<ReportesPageComponent>;
    let execute: jest.Mock;
    let alert: { show: jest.Mock };

    beforeEach(async () => {
        execute = jest.fn().mockReturnValue(of(reporteDePrueba()));
        alert = { show: jest.fn() };
        await TestBed.configureTestingModule({
            imports: [ReportesPageComponent],
            providers: [
                { provide: GetReporteAvanceMensualUseCase, useValue: { execute } },
                { provide: AlertService, useValue: alert }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ReportesPageComponent);
        component = fixture.componentInstance;
    });

    it('should select the matching reporte option on change', () => {
        component.onReporteChange('kardex');
        expect(component.selectedReporte()?.label).toBe('Kardex de Movimientos');
    });

    it('should clear the selection when the value has no matching option', () => {
        component.onReporteChange('inexistente');
        expect(component.selectedReporte()).toBeNull();
    });

    it('should not start generating a report without a selection', () => {
        component.generarReporte();
        expect(component.loading()).toBe(false);
        expect(execute).not.toHaveBeenCalled();
    });

    it('ofrece el avance mensual por región como primer tipo de reporte', () => {
        expect(component.reporteOptions[0].value).toBe(ReportesPageComponent.AVANCE_MENSUAL);
    });

    it('propone por defecto el año en curso', () => {
        const anio = new Date().getFullYear();
        expect(component.fechaInicio).toBe(`${anio}-01-01`);
        expect(component.fechaFin).toBe(`${anio}-12-31`);
    });

    it('genera el avance mensual con las fechas elegidas y lo muestra en la tabla', () => {
        component.onReporteChange(ReportesPageComponent.AVANCE_MENSUAL);
        component.fechaInicio = '2026-07-01';
        component.fechaFin = '2026-08-31';

        component.generarReporte();
        fixture.detectChanges();

        expect(execute).toHaveBeenCalledWith('2026-07-01', '2026-08-31');
        expect(component.loading()).toBe(false);
        expect(fixture.nativeElement.querySelector('app-avance-mensual-table')).not.toBeNull();
    });

    it('no llama a la API si el fin es anterior al inicio', () => {
        component.onReporteChange(ReportesPageComponent.AVANCE_MENSUAL);
        component.fechaInicio = '2026-08-01';
        component.fechaFin = '2026-07-31';

        component.generarReporte();

        expect(execute).not.toHaveBeenCalled();
        expect(alert.show).toHaveBeenCalledWith('Periodo inválido', expect.any(String), 'warning');
    });

    it('muestra el mensaje de la API si no se puede generar (p. ej. 403 sin el menú)', () => {
        execute.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403, error: { mensaje: 'No tiene acceso a Reportes.' } })));
        component.onReporteChange(ReportesPageComponent.AVANCE_MENSUAL);

        component.generarReporte();
        fixture.detectChanges();

        expect(component.error()).toBe('No tiene acceso a Reportes.');
        expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain('No tiene acceso a Reportes.');
    });

    it('avisa si el reporte no tiene regiones con datos', () => {
        execute.mockReturnValue(of({ ...reporteDePrueba(), filas: [] }));
        component.onReporteChange(ReportesPageComponent.AVANCE_MENSUAL);

        component.generarReporte();
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('No hay programación ni ejecución en el periodo');
    });

    it('los demás tipos siguen pendientes y lo avisan', () => {
        component.onReporteChange('kardex');

        component.generarReporte();

        expect(execute).not.toHaveBeenCalled();
        expect(alert.show).toHaveBeenCalledWith('Reporte en preparación', expect.any(String), 'info');
    });
});

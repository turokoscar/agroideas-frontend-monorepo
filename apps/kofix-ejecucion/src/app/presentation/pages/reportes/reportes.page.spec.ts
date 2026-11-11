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
    let descargar: jest.Mock;
    let alert: { show: jest.Mock };

    beforeEach(async () => {
        execute = jest.fn().mockReturnValue(of(reporteDePrueba()));
        descargar = jest.fn().mockReturnValue(of({
            blob: new Blob(['datos']),
            nombreArchivo: 'avance-mensual_2026-07-01_2026-08-31.xlsx'
        }));
        alert = { show: jest.fn() };
        await TestBed.configureTestingModule({
            imports: [ReportesPageComponent],
            providers: [
                { provide: GetReporteAvanceMensualUseCase, useValue: { execute, descargar } },
                { provide: AlertService, useValue: alert }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ReportesPageComponent);
        component = fixture.componentInstance;
    });

    it('should select the matching reporte option on change', () => {
        component.onReporteChange(ReportesPageComponent.AVANCE_MENSUAL);
        expect(component.selectedReporte()?.label).toBe('Avance mensual por región');
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

    it('lista únicamente los reportes implementados (avance mensual por región)', () => {
        expect(component.reporteOptions.map(o => o.value)).toEqual([ReportesPageComponent.AVANCE_MENSUAL]);
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

    it('deshabilita Excel y PDF mientras no haya un reporte con datos generado', () => {
        expect(component.puedeExportar()).toBe(false);
        component.exportarExcel();
        expect(descargar).not.toHaveBeenCalled();

        component.onReporteChange(ReportesPageComponent.AVANCE_MENSUAL);
        component.generarReporte();
        expect(component.puedeExportar()).toBe(true);
    });

    it('descarga el Excel y el PDF con el nombre que envía la API', () => {
        const espiaDescarga = jest.spyOn(
            component as unknown as { dispararDescarga: (b: Blob, n: string) => void },
            'dispararDescarga'
        ).mockImplementation(() => undefined);

        component.onReporteChange(ReportesPageComponent.AVANCE_MENSUAL);
        component.generarReporte();

        component.exportarExcel();
        expect(descargar).toHaveBeenCalledWith('2026-07-01', '2026-08-31', 'excel');
        expect(espiaDescarga).toHaveBeenCalledWith(expect.any(Blob), 'avance-mensual_2026-07-01_2026-08-31.xlsx');

        descargar.mockReturnValueOnce(of({ blob: new Blob(['%PDF']), nombreArchivo: 'avance-mensual_2026-07-01_2026-08-31.pdf' }));
        component.exportarPdf();
        expect(descargar).toHaveBeenCalledWith('2026-07-01', '2026-08-31', 'pdf');
        expect(espiaDescarga).toHaveBeenCalledWith(expect.any(Blob), 'avance-mensual_2026-07-01_2026-08-31.pdf');
    });

    it('si la exportación responde 400 o 403 lee el mensaje JSON dentro del blob y lo muestra', async () => {
        const blobError = new Blob([JSON.stringify({ mensaje: 'No tiene acceso a Reportes.' })], { type: 'application/json' });
        descargar.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403, error: blobError })));

        component.onReporteChange(ReportesPageComponent.AVANCE_MENSUAL);
        component.generarReporte();
        component.exportarPdf();

        await new Promise(resolve => setTimeout(resolve, 20));
        expect(alert.show).toHaveBeenCalledWith('Error al exportar', 'No tiene acceso a Reportes.', 'error');
    });
});

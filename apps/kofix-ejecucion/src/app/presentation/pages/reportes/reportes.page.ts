import { UIButtonComponent, UICardComponent, UiKpiComponent, UiStateComponent } from '@agroideas/ui';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AlertService } from '@agroideas/feedback';
import { finalize } from 'rxjs';
import { GetReporteAvanceMensualUseCase } from '../../../domain/usecases/reporte/get-reporte-avance-mensual.usecase';
import { ReporteAvance } from '../../../domain/models/reporte/reporte-avance.model';
import { AvanceMensualTableComponent } from '../../components/avance-mensual-table/avance-mensual-table.component';

export interface ReporteOption {
    label: string;
    value: string;
    icon: string;
    description: string;
}

@Component({
    selector: 'app-reportes-page',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        UiKpiComponent,
        UICardComponent,
        UIButtonComponent,
        UiStateComponent,
        AvanceMensualTableComponent
    ],
    templateUrl: './reportes.page.html',
    styleUrls: ['./reportes.page.sass'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportesPageComponent {
    /** Único tipo de reporte con datos por ahora; los demás siguen pendientes (ADR-018). */
    static readonly AVANCE_MENSUAL = 'avance-mensual';

    private readonly getReporteAvance = inject(GetReporteAvanceMensualUseCase);
    private readonly alertService = inject(AlertService);

    loading = signal(false);

    reporteOptions: ReporteOption[] = [
        {
            label: 'Avance mensual por región',
            value: ReportesPageComponent.AVANCE_MENSUAL,
            icon: 'grid_view',
            description: 'Programado, ejecutado y saldo por región y mes, con semáforo de desempeño (ADR-028)'
        },
        {
            label: 'Resumen de Ejecución',
            value: 'resumen-ejecucion',
            icon: 'analytics',
            description: 'Ejecución acumulada, saldo disponible y porcentajes por convenio'
        },
        {
            label: 'Kardex de Movimientos',
            value: 'kardex',
            icon: 'swap_horiz',
            description: 'Movimientos de entrada y salida consolidados'
        },
        {
            label: 'Estado de Convenios',
            value: 'estado-convenios',
            icon: 'assignment',
            description: 'Lista de convenios con estado actual'
        },
        {
            label: 'Programación Multianual',
            value: 'programacion',
            icon: 'calendar_month',
            description: 'Programación mensual y anual por convenio'
        },
        {
            label: 'Convenios con Riesgo',
            value: 'convenios-riesgo',
            icon: 'warning',
            description: 'Convenios que presentan alertas o situaciones críticas'
        },
        {
            label: 'Programado vs Ejecutado',
            value: 'programado-vs-ejecutado',
            icon: 'compare_arrows',
            description: 'Comparativo entre montos programados y ejecución real por periodo'
        }
    ];

    selectedReporteValue: string | null = null;
    selectedReporte = signal<ReporteOption | null>(null);

    /** Fechas del corte (yyyy-MM-dd, como las da el input date). Por defecto, el año en curso. */
    fechaInicio = `${new Date().getFullYear()}-01-01`;
    fechaFin = `${new Date().getFullYear()}-12-31`;

    reporteAvance = signal<ReporteAvance | null>(null);
    error = signal<string | null>(null);

    onReporteChange(value: string | null): void {
        this.selectedReporte.set(this.reporteOptions.find(r => r.value === value) ?? null);
        this.reporteAvance.set(null);
        this.error.set(null);
    }

    esAvanceMensual(): boolean {
        return this.selectedReporte()?.value === ReportesPageComponent.AVANCE_MENSUAL;
    }

    generarReporte(): void {
        if (!this.selectedReporte()) return;
        if (!this.esAvanceMensual()) {
            this.alertService.show('Reporte en preparación', 'Este tipo de reporte todavía no está disponible.', 'info');
            return;
        }
        if (!this.fechaInicio || !this.fechaFin) {
            this.alertService.show('Fechas requeridas', 'Indique la fecha de inicio y la de fin del periodo.', 'warning');
            return;
        }
        if (this.fechaFin < this.fechaInicio) {
            this.alertService.show('Periodo inválido', 'La fecha de fin no puede ser anterior a la de inicio.', 'warning');
            return;
        }

        this.loading.set(true);
        this.error.set(null);
        this.reporteAvance.set(null);
        this.getReporteAvance.execute(this.fechaInicio, this.fechaFin).pipe(
            finalize(() => this.loading.set(false))
        ).subscribe({
            next: reporte => this.reporteAvance.set(reporte),
            error: (err: unknown) => {
                const mensaje = err instanceof HttpErrorResponse ? err.error?.mensaje : undefined;
                this.error.set(typeof mensaje === 'string' && mensaje.trim() ? mensaje : 'No se pudo generar el reporte.');
            }
        });
    }

    exportarExcel(): void {
        if (!this.selectedReporte()) return;
    }

    exportarPdf(): void {
        if (!this.selectedReporte()) return;
    }
}

import { UIButtonComponent, UICardComponent, UiKpiComponent } from '@agroideas/ui';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
        UIButtonComponent
    ],
    templateUrl: './reportes.page.html',
    styleUrls: ['./reportes.page.sass'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportesPageComponent {
    loading = signal(false);

    reporteOptions: ReporteOption[] = [
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

    selectedReporteValue = signal<string | null>(null);
    selectedReporte = signal<ReporteOption | null>(null);
    fechaInicio = signal<Date | null>(null);
    fechaFin = signal<Date | null>(null);

    onReporteChange(event: any): void {
        const val = event.value as string;
        const found = this.reporteOptions.find(r => r.value === val) || null;
        this.selectedReporte.set(found);
    }

    generarReporte(): void {
        if (!this.selectedReporte()) return;
        this.loading.set(true);
        this.loading.set(false);
    }

    exportarExcel(): void {
        if (!this.selectedReporte()) return;
    }

    exportarPdf(): void {
        if (!this.selectedReporte()) return;
    }
}
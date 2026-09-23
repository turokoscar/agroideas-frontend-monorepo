import { ChangeDetectionStrategy, Component, OnInit, OnDestroy, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AlertService } from '@agroideas/feedback';
import { ConvenioRepository } from '../../../domain/repositories/convenio.repository';
import { ReporteMensualItem, ResumenEjecutivo } from '../../../domain/models/convenio.model';
import { ResumenEjecutivoComponent } from '../../components/resumen-ejecutivo/resumen-ejecutivo.component';
import { ReporteMensualChartComponent } from '../../components/reporte-mensual-chart/reporte-mensual-chart.component';
import { DonutData, ReporteMensualDonutComponent } from '../../components/reporte-mensual-donut/reporte-mensual-donut.component';

/** Primer año fiscal navegable en el dashboard. */
const MIN_FISCAL_YEAR = 2020;
/** Años hacia adelante navegables (programación multianual). */
const YEARS_AHEAD = 2;

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ResumenEjecutivoComponent,
        ReporteMensualChartComponent,
        ReporteMensualDonutComponent
    ],
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.sass'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent implements OnInit, OnDestroy {
    private convenioRepo = inject(ConvenioRepository);
    private alertService = inject(AlertService);
    private chartSubscription?: Subscription;
    private readonly currentYear = new Date().getFullYear();

    /** Años del selector único de período del dashboard. */
    readonly availableYears: number[] = Array.from(
        { length: this.currentYear + YEARS_AHEAD - MIN_FISCAL_YEAR + 1 },
        (_, i) => MIN_FISCAL_YEAR + i
    );
    
    loadingResumen = signal<boolean>(true);
    loadingChart = signal<boolean>(true);
    errorResumen = signal<string | null>(null);
    errorChart = signal<string | null>(null);
    
    resumenData = signal<ResumenEjecutivo | null>(null);
    chartData = signal<ReporteMensualItem[]>([]);
    selectedYear = signal<number>(this.currentYear);

    readonly donutData = computed<DonutData>(() => {
        const data = this.chartData();
        const totalProgramado = data.reduce((sum: number, d: ReporteMensualItem) => sum + (Number(d.programado) || 0), 0);
        const totalEjecutado = data.reduce((sum: number, d: ReporteMensualItem) => sum + (Number(d.ejecutado) || 0), 0);
        return { mes: 0, programado: totalProgramado, ejecutado: totalEjecutado };
    });

    ngOnInit(): void {
        this.loadResumenEjecutivo();
        this.loadReporteMensual(this.selectedYear());
    }

    ngOnDestroy(): void {
        this.chartSubscription?.unsubscribe();
    }

    loadResumenEjecutivo(): void {
        this.loadingResumen.set(true);
        this.errorResumen.set(null);
        this.convenioRepo.getResumenEjecutivo().subscribe({
            next: (data) => {
                this.resumenData.set(data);
                this.loadingResumen.set(false);
            },
            error: () => {
                this.errorResumen.set('No se pudieron cargar las métricas del resumen ejecutivo.');
                this.loadingResumen.set(false);
                this.alertService.toast('Error al cargar las métricas del resumen ejecutivo', 'error');
            }
        });
    }

    loadReporteMensual(year: number): void {
        this.chartSubscription?.unsubscribe();
        this.loadingChart.set(true);
        this.errorChart.set(null);
        this.selectedYear.set(year);
        this.chartSubscription = this.convenioRepo.getReporteMensual(year).subscribe({
            next: (res) => {
                this.chartData.set(res?.reporte || []);
                this.loadingChart.set(false);
            },
            error: () => {
                this.errorChart.set('No se pudo cargar el reporte mensual de ejecución.');
                this.loadingChart.set(false);
                this.alertService.toast('Error al cargar el reporte de ejecución mensual', 'error');
            }
        });
    }

    onYearChange(year: number): void {
        this.loadReporteMensual(year);
    }

    retryResumen(): void {
        this.loadResumenEjecutivo();
    }

    retryChart(): void {
        this.loadReporteMensual(this.selectedYear());
    }
}

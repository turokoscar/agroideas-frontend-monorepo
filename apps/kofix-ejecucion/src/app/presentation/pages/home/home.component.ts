import { Component, OnInit, OnDestroy, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ConvenioRepository } from '../../../domain/repositories/convenio.repository';
import { ResumenEjecutivoComponent } from '../../components/resumen-ejecutivo/resumen-ejecutivo.component';
import { ReporteMensualChartComponent } from '../../components/reporte-mensual-chart/reporte-mensual-chart.component';
import { ReporteMensualDonutComponent } from '../../components/reporte-mensual-donut/reporte-mensual-donut.component';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [
        CommonModule,
        ResumenEjecutivoComponent,
        ReporteMensualChartComponent,
        ReporteMensualDonutComponent
    ],
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.sass']
})
export class HomeComponent implements OnInit, OnDestroy {
    private convenioRepo = inject(ConvenioRepository);
    private chartSubscription?: Subscription;
    
    loadingResumen = signal<boolean>(true);
    loadingChart = signal<boolean>(true);
    
    resumenData = signal<any>(null);
    chartData = signal<any[]>([]);
    selectedYear = signal<number>(2026);

    readonly donutData = computed(() => {
        const data = this.chartData();
        const totalProgramado = data.reduce((sum: number, d: any) => sum + (Number(d.programado) || 0), 0);
        const totalEjecutado = data.reduce((sum: number, d: any) => sum + (Number(d.ejecutado) || 0), 0);
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
        this.convenioRepo.getResumenEjecutivo().subscribe({
            next: (data) => {
                this.resumenData.set(data);
                this.loadingResumen.set(false);
            },
            error: (err) => {
                console.error('Error al cargar resumen ejecutivo del home:', err);
                this.loadingResumen.set(false);
            }
        });
    }

    loadReporteMensual(year: number): void {
        this.chartSubscription?.unsubscribe();
        this.loadingChart.set(true);
        this.selectedYear.set(year);
        this.chartSubscription = this.convenioRepo.getReporteMensual(year).subscribe({
            next: (res) => {
                this.chartData.set(res?.reporte || []);
                this.loadingChart.set(false);
            },
            error: (err) => {
                console.error('Error al cargar reporte mensual:', err);
                this.loadingChart.set(false);
            }
        });
    }

    onYearChange(year: number): void {
        this.loadReporteMensual(year);
    }
}

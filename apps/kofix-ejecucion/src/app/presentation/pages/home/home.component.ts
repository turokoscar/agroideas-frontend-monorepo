import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConvenioRepository } from '../../../domain/repositories/convenio.repository';
import { ResumenEjecutivoComponent } from '../../components/resumen-ejecutivo/resumen-ejecutivo.component';
import { ReporteMensualChartComponent } from '../../components/reporte-mensual-chart/reporte-mensual-chart.component';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [CommonModule, ResumenEjecutivoComponent, ReporteMensualChartComponent],
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.sass']
})
export class HomeComponent implements OnInit {
    private convenioRepo = inject(ConvenioRepository);
    
    loadingResumen = signal<boolean>(true);
    loadingChart = signal<boolean>(true);
    
    resumenData = signal<any>(null);
    chartData = signal<any[]>([]);
    selectedYear = signal<number>(2026); // Default year in course

    ngOnInit(): void {
        this.loadResumenEjecutivo();
        this.loadReporteMensual(this.selectedYear());
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
        this.loadingChart.set(true);
        this.selectedYear.set(year);
        this.convenioRepo.getReporteMensual(year).subscribe({
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

import { UIButtonComponent, UICardComponent, UiKpiComponent, UiStateComponent } from '@agroideas/ui';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AlertService } from '@agroideas/feedback';
import { finalize } from 'rxjs';
import { GetReporteAvanceMensualUseCase } from '../../../domain/usecases/reporte/get-reporte-avance-mensual.usecase';
import { FormatoReporteAvance } from '../../../domain/repositories/reporte.repository';
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
        }
    ];

    selectedReporteValue: string | null = null;
    selectedReporte = signal<ReporteOption | null>(null);

    /** Fechas del corte (yyyy-MM-dd, como las da el input date). Por defecto, el año en curso. */
    fechaInicio = `${new Date().getFullYear()}-01-01`;
    fechaFin = `${new Date().getFullYear()}-12-31`;

    reporteAvance = signal<ReporteAvance | null>(null);
    error = signal<string | null>(null);
    exportando = signal<FormatoReporteAvance | null>(null);

    onReporteChange(value: string | null): void {
        this.selectedReporte.set(this.reporteOptions.find(r => r.value === value) ?? null);
        this.reporteAvance.set(null);
        this.error.set(null);
    }

    esAvanceMensual(): boolean {
        return this.selectedReporte()?.value === ReportesPageComponent.AVANCE_MENSUAL;
    }

    /** Los botones Excel y PDF solo se habilitan cuando hay un reporte con datos generado (ADR-028, 4.4). */
    puedeExportar(): boolean {
        const reporte = this.reporteAvance();
        return !!reporte && reporte.filas.length > 0 && !this.loading() && this.exportando() === null;
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
        this.exportar('excel');
    }

    exportarPdf(): void {
        this.exportar('pdf');
    }

    private exportar(formato: FormatoReporteAvance): void {
        const reporte = this.reporteAvance();
        if (!reporte || !this.puedeExportar()) return;

        const inicio = reporte.fechaInicio.slice(0, 10);
        const fin = reporte.fechaFin.slice(0, 10);
        this.exportando.set(formato);

        this.getReporteAvance.descargar(inicio, fin, formato).pipe(
            finalize(() => this.exportando.set(null))
        ).subscribe({
            next: ({ blob, nombreArchivo }) => this.dispararDescarga(blob, nombreArchivo),
            error: (err: unknown) => {
                void this.leerMensajeError(err).then(mensaje => {
                    this.alertService.show('Error al exportar', mensaje, 'error');
                });
            }
        });
    }

    /** Punto de extensión para descargar el blob con el nombre que envía la API. */
    protected dispararDescarga(blob: Blob, nombreArchivo: string): void {
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = nombreArchivo;
        enlace.click();
        URL.revokeObjectURL(url);
    }

    /** Cuando responseType es 'blob', un 400 o 403 trae el JSON del envoltorio dentro de un Blob. */
    private async leerMensajeError(err: unknown): Promise<string> {
        const porDefecto = 'No se pudo exportar el reporte.';
        if (!(err instanceof HttpErrorResponse)) return porDefecto;

        if (typeof err.error?.mensaje === 'string' && err.error.mensaje.trim()) {
            return err.error.mensaje;
        }
        if (err.error instanceof Blob) {
            try {
                const texto = await this.leerTextoBlob(err.error);
                const json = JSON.parse(texto) as { mensaje?: string };
                if (typeof json?.mensaje === 'string' && json.mensaje.trim()) {
                    return json.mensaje;
                }
            } catch {
                // Si el cuerpo no es JSON válido, se usa el mensaje por defecto.
            }
        }
        return porDefecto;
    }

    private leerTextoBlob(blob: Blob): Promise<string> {
        if (typeof blob.text === 'function') {
            return blob.text();
        }
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
            reader.onerror = () => reject(reader.error);
            reader.readAsText(blob);
        });
    }
}

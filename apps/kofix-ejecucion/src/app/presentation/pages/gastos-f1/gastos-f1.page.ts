import { TableColumn, UIButtonComponent, UiDataTableComponent } from '@agroideas/ui';
import { AlertService } from '@agroideas/feedback';
import { formatConvenioNumber, formatCurrency } from '@agroideas/utils';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { GetConvenioByIdUseCase } from '../../../domain/usecases/get-convenio-by-id.usecase';
import { Convenio } from '../../../domain/models/convenio.model';
import { GastoF1 } from '../../../domain/models/rendicion.model';
import { RendicionRepository } from '../../../domain/repositories/rendicion.repository';

/**
 * Página dedicada del reporte "Gastos F1" (ADR-016 Fase 4): consolidado de gastos
 * rendidos por convenio, uno por línea de comprobante/ítem, para exhibición en pantalla.
 */
@Component({
    selector: 'app-gastos-f1-page',
    standalone: true,
    imports: [CommonModule, UiDataTableComponent, UIButtonComponent],
    templateUrl: './gastos-f1.page.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class GastosF1PageComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private getConvenioByIdUseCase = inject(GetConvenioByIdUseCase);
    private rendicionRepo = inject(RendicionRepository);
    private alertService = inject(AlertService);

    postulanteId = signal(0);
    convenio = signal<Convenio | null>(null);
    gastos = signal<GastoF1[]>([]);
    loading = signal(false);

    totalMontoRendido = computed(() => this.gastos().reduce((sum, g) => sum + (g.montoRendido || 0), 0));

    columns: TableColumn[] = [
        { field: 'fechaEmision', header: 'Fecha Emisión', type: 'date', width: '110px' },
        { field: 'tipoCpe', header: 'Tipo CP', width: '130px' },
        { field: 'serieNumero', header: 'Serie-Número', width: '150px' },
        { field: 'proveedorRuc', header: 'RUC Proveedor', width: '120px' },
        { field: 'proveedorNombre', header: 'Proveedor', width: '220px' },
        { field: 'itemNombre', header: 'Ítem', width: '220px' },
        { field: 'unidadMedida', header: 'Unidad', width: '90px' },
        { field: 'cantidad', header: 'Cantidad', type: 'custom', width: '90px', align: 'right' },
        { field: 'precioAdjudicado', header: 'Precio Adjudicado', type: 'custom', width: '140px', align: 'right' },
        { field: 'montoRendido', header: 'Monto Rendido', type: 'custom', width: '140px', align: 'right' },
        { field: 'archivoUrl', header: 'Comprobante', type: 'custom', width: '110px', align: 'center' }
    ];

    ngOnInit(): void {
        const id = Number(this.route.snapshot.paramMap.get('id'));
        if (!id) return;

        this.postulanteId.set(id);
        this.getConvenioByIdUseCase.execute(id).subscribe(c => this.convenio.set(c));
        this.loadGastos();
    }

    loadGastos(): void {
        const id = this.postulanteId();
        if (!id) return;

        this.loading.set(true);
        this.rendicionRepo.getGastosF1(id).pipe(
            finalize(() => this.loading.set(false))
        ).subscribe({
            next: (data) => this.gastos.set(data)
        });
    }

    downloadArchivo(urlArchivo: string): void {
        this.rendicionRepo.downloadFile(urlArchivo).subscribe({
            next: (blob) => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = urlArchivo.split('/').pop() || 'comprobante.pdf';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            },
            error: () => {
                this.alertService.show('Error', 'No se pudo descargar el comprobante.', 'error');
            }
        });
    }

    formatCurrency(value?: number): string {
        return formatCurrency(value || 0);
    }

    formatConvenioNumber(): string {
        const c = this.convenio();
        if (!c) return '-';
        return formatConvenioNumber(c.numeroConvenio, c.fechaInicio);
    }

    goBack(): void {
        this.router.navigate(['/main/convenios', this.postulanteId()], { queryParams: { tab: 'rendiciones' } });
    }
}

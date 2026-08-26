import { StatusType, TableColumn, UIButtonComponent, UiDataTableComponent, UiFilterBarComponent, UiProgressBarComponent, UiStatusPillComponent } from '@agroideas/ui';
import { formatConvenioNumber } from '@agroideas/utils';
import { ChangeDetectionStrategy, Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ConvenioRepository } from '../../../domain/repositories/convenio.repository';
import { ExportService } from '../../../shared/services/export.service';
import { finalize } from 'rxjs/operators';

interface LazyLoadEvent {
    first?: number;
    rows?: number;
}

/**
 * Bandeja de trabajo de Ejecución (ADR-019 Fase 3): convenios vigentes de la cartera del usuario
 * con programación ya al 100%, listos para gestión financiera (No Objeción, Desembolsos,
 * Rendiciones, Kardex).
 */
@Component({
    selector: 'app-ejecucion-page',
    standalone: true,
    imports: [CommonModule, FormsModule, UiDataTableComponent, UiFilterBarComponent, UiStatusPillComponent, UiProgressBarComponent, UIButtonComponent],
    templateUrl: './ejecucion.page.html',
    styleUrls: ['./ejecucion.page.sass'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class EjecucionPageComponent implements OnInit {
    private convenioRepo = inject(ConvenioRepository);
    private router = inject(Router);
    exportService = inject(ExportService);

    convenios = signal<any[]>([]);
    loading = signal(false);
    totalRecords = signal(0);
    pageSize = signal(10);
    readonly rowsOptions = [5, 10, 20, 50, 100];
    search = signal('');
    estadoFilter = signal('');

    columns: TableColumn[] = [
        { field: 'numeroConvenio', header: 'N° Convenio', width: '120px' },
        { field: 'razonSocial', header: 'Organización', type: 'custom' },
        { field: 'estado', header: 'Estado', type: 'custom', align: 'center', width: '110px' },
        { field: 'montoAprobado', header: 'Monto Aprobado', type: 'currency', align: 'right', width: '145px' },
        { field: 'montoEjecutado', header: 'Ejecutado', type: 'custom', width: '160px' }
    ];

    ngOnInit(): void {
        this.loadData({ first: 0, rows: this.pageSize() });
    }

    loadData(event: LazyLoadEvent): void {
        this.loading.set(true);
        const page = event.first ? Math.floor(event.first / (event.rows ?? this.pageSize())) + 1 : 1;
        const size = event.rows ?? this.pageSize();

        this.convenioRepo.getEnEjecucion(page, size, this.search()).pipe(finalize(() => this.loading.set(false))).subscribe({
            next: (res: { datos: any[], total: number }) => {
                let datos = res.datos;
                if (this.estadoFilter()) {
                    datos = datos.filter((c) => c.estado === this.estadoFilter());
                }
                this.convenios.set(datos);
                this.totalRecords.set(res.total);
            },
            error: () => {}
        });
    }

    onSearch(): void {
        this.loadData({ first: 0, rows: this.pageSize() });
    }

    onRowsChange(rows: number): void {
        this.pageSize.set(rows);
    }

    getStatusType(item: any): StatusType {
        const map: Record<string, StatusType> = {
            VIGENTE: 'Activo',
            POR_INICIAR: 'Pendiente',
            FINALIZADO: 'Finalizado',
            SUSPENDIDO: 'Suspendido'
        };
        return map[item.estado] ?? 'Finalizado';
    }

    getStatusLabel(item: any): string {
        const map: Record<string, string> = {
            VIGENTE: 'Activo',
            POR_INICIAR: 'Por Iniciar',
            FINALIZADO: 'Finalizado',
            SUSPENDIDO: 'Suspendido'
        };
        return map[item.estado] ?? item.estado;
    }

    gestionarEjecucion(item: any): void {
        this.router.navigate(['/main/ejecucion', item.id]);
    }

    formatConvenioNumber(item: any): string {
        if (!item?.numeroConvenio) return '-';
        return formatConvenioNumber(item.numeroConvenio, item.fechaInicio);
    }
}

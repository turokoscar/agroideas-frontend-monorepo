import { StatusType, TableColumn, UIButtonComponent, UiDataTableComponent, UiFilterBarComponent, UiStatusPillComponent } from '@agroideas/ui';
import { formatConvenioNumber } from '@agroideas/utils';
import { ChangeDetectionStrategy, Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ConvenioFiltrosVigente, ConvenioRepository } from '../../../domain/repositories/convenio.repository';
import { ExportService } from '../../../shared/services/export.service';
import { finalize } from 'rxjs/operators';
import { UbigeoCascadaFilterComponent, UbigeoFiltro } from '../../components/ubigeo-cascada-filter/ubigeo-cascada-filter.component';

interface LazyLoadEvent {
    first?: number;
    rows?: number;
}

@Component({
    selector: 'app-programacion-vigente-page',
    standalone: true,
    imports: [CommonModule, FormsModule, UiDataTableComponent, UiFilterBarComponent, UiStatusPillComponent, UIButtonComponent, UbigeoCascadaFilterComponent],
    templateUrl: './programacion-vigente.page.html',
    styleUrls: ['./programacion-vigente.page.sass'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProgramacionVigentePageComponent implements OnInit {
    private convenioRepo = inject(ConvenioRepository);
    private router = inject(Router);
    exportService = inject(ExportService);

    Math = Math;

    convenios = signal<any[]>([]);
    loading = signal(false);
    totalRecords = signal(0);
    pageSize = signal(10);
    readonly rowsOptions = [5, 10, 20, 50, 100];

    search = signal('');
    ubigeoFiltro = signal<UbigeoFiltro>({});
    periodoFiltro = signal<number | null>(null);

    /** Rango fijo calculado en cliente (ADR-022 Fase 0) -- sin endpoint nuevo. */
    readonly aniosDisponibles: number[] = (() => {
        const actual = new Date().getFullYear();
        const anios: number[] = [];
        for (let a = actual + 1; a >= 2015; a--) anios.push(a);
        return anios;
    })();

    columns: TableColumn[] = [
        { field: 'numeroConvenio', header: 'N° Convenio', width: '120px' },
        { field: 'razonSocial', header: 'Organización', type: 'custom' },
        { field: 'estado', header: 'Estado', type: 'custom', align: 'center', width: '130px' },
        { field: 'montoAprobado', header: 'Monto Aprobado', type: 'currency', align: 'right', width: '145px' },
        { field: 'programacionAcumulada', header: 'Total Programado', type: 'currency', align: 'right', width: '145px' },
        { field: 'porcentajeProgramado', header: '% Programado', type: 'custom', align: 'right', width: '160px' }
    ];

    ngOnInit(): void {
        this.loadData({ first: 0, rows: this.pageSize() });
    }

    loadData(event: LazyLoadEvent): void {
        this.loading.set(true);
        const page = event.first ? Math.floor(event.first / (event.rows ?? this.pageSize())) + 1 : 1;
        const size = event.rows ?? this.pageSize();

        const filtros: ConvenioFiltrosVigente = {
            ...this.ubigeoFiltro(),
            periodo: this.periodoFiltro() ?? undefined
        };

        this.convenioRepo.getVigente(page, size, this.search(), filtros).pipe(finalize(() => this.loading.set(false))).subscribe({
            next: (res: { datos: any[], total: number }) => {
                this.convenios.set(res.datos);
                this.totalRecords.set(res.total);
            },
            error: () => {}
        });
    }

    onSearch(): void {
        this.loadData({ first: 0, rows: this.pageSize() } as LazyLoadEvent);
    }

    onRowsChange(rows: number): void {
        this.pageSize.set(rows);
    }

    onUbigeoFiltroChange(filtro: UbigeoFiltro): void {
        this.ubigeoFiltro.set(filtro);
        this.loadData({ first: 0, rows: this.pageSize() });
    }

    onPeriodoFiltroChange(periodo: string): void {
        this.periodoFiltro.set(periodo ? Number(periodo) : null);
        this.loadData({ first: 0, rows: this.pageSize() });
    }

    getPorcentajeProgramado(item: any): number {
        const monto = item.montoAprobado || item.aporteProgramadoAgroideas || 0;
        const prog = item.programacionAcumulada || 0;
        if (monto <= 0) return 0;
        return Math.min((prog / monto) * 100, 100);
    }

    getProgressLevel(item: any): string {
        const pct = this.getPorcentajeProgramado(item);
        if (pct >= 100) return 'full';
        if (pct >= 50) return 'mid';
        return 'low';
    }

    getStatusType(item: any): StatusType {
        const pct = this.getPorcentajeProgramado(item);
        if (pct >= 100) return 'Activo';
        if (pct >= 50) return 'Media';
        if (pct > 0) return 'Pendiente';
        return 'Crítica';
    }

    getStatusLabel(item: any): string {
        const pct = this.getPorcentajeProgramado(item);
        if (pct >= 100) return 'Programado';
        if (pct >= 50) return 'En proceso';
        if (pct > 0) return 'En proceso';
        return 'No programado';
    }

    goToProgramacion(item: any): void {
        this.router.navigate(['/main/programacion-vigente', item.id]);
    }

    formatConvenioNumber(item: any): string {
        if (!item?.numeroConvenio) return '-';
        return formatConvenioNumber(item.numeroConvenio, item.fechaInicio);
    }
}
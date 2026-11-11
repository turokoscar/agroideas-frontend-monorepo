import { StatusTone, TableColumn, UIButtonComponent, UiDataTableComponent, UiFilterBarComponent, UiProgressBarComponent, UiStatusPillComponent, UiPageHeaderComponent } from '@agroideas/ui';
import { formatConvenioNumber } from '@agroideas/utils';
import { ChangeDetectionStrategy, Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Convenio } from '../../../domain/models/convenio.model';
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
    imports: [UiPageHeaderComponent, CommonModule, FormsModule, UiDataTableComponent, UiFilterBarComponent, UiProgressBarComponent, UiStatusPillComponent, UIButtonComponent, UbigeoCascadaFilterComponent],
    templateUrl: './programacion-vigente.page.html',
    styleUrls: ['./programacion-vigente.page.sass'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProgramacionVigentePageComponent implements OnInit {
    private convenioRepo = inject(ConvenioRepository);
    private router = inject(Router);
    exportService = inject(ExportService);

    convenios = signal<Convenio[]>([]);
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
            next: (res) => {
                this.convenios.set(res.datos);
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

    onUbigeoFiltroChange(filtro: UbigeoFiltro): void {
        this.ubigeoFiltro.set(filtro);
        this.loadData({ first: 0, rows: this.pageSize() });
    }

    onPeriodoFiltroChange(periodo: string): void {
        this.periodoFiltro.set(periodo ? Number(periodo) : null);
        this.loadData({ first: 0, rows: this.pageSize() });
    }

    /** % de la programación acumulada sobre el monto aprobado, tope 100. */
    getPorcentajeProgramado(convenio: Convenio): number {
        if (!convenio.montoAprobado || convenio.montoAprobado <= 0) return 0;
        return Math.min(((convenio.programacionAcumulada || 0) / convenio.montoAprobado) * 100, 100);
    }

    getStatusTone(convenio: Convenio): StatusTone {
        const pct = this.getPorcentajeProgramado(convenio);
        if (pct >= 100) return 'success';
        if (pct >= 50) return 'info';
        if (pct > 0) return 'warning';
        return 'danger';
    }

    getStatusLabel(convenio: Convenio): string {
        const pct = this.getPorcentajeProgramado(convenio);
        if (pct >= 100) return 'Programado';
        if (pct > 0) return 'En proceso';
        return 'No programado';
    }

    goToProgramacion(convenio: Convenio): void {
        this.router.navigate(['/main/programacion-vigente', convenio.id]);
    }

    formatConvenioNumber(convenio: Convenio): string {
        if (!convenio?.numeroConvenio) return '-';
        // fechaInicio es la fecha de firma (mc-api-ejecucion la mapea desde FechaFirma).
        return formatConvenioNumber(convenio.numeroConvenio, convenio.fechaInicio);
    }
}
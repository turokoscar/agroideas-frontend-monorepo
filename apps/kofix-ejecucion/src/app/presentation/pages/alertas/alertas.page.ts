import { StatusType, TableColumn, UiDataTableComponent, UiFilterBarComponent, UiKpiComponent, UiStatusPillComponent } from '@agroideas/ui';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { AlertaRepository } from '../../../domain/repositories/alerta.repository';
import { Alerta, AlertaFilter } from '../../../domain/models/alerta.model';

export interface AlertaOption {
    label: string;
    value: string;
}

@Component({
    selector: 'app-alertas-page',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        UiDataTableComponent,
        UiStatusPillComponent,
        UiKpiComponent,
        UiFilterBarComponent
    ],
    templateUrl: './alertas.page.html',
    styleUrls: ['./alertas.page.sass'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AlertasPageComponent implements OnInit {
    private alertaRepo = inject(AlertaRepository);

    ngOnInit(): void {
        this.loadData();
    }

    loading = signal(false);
    totalRecords = signal(0);
    alertas = signal<Alerta[]>([]);

    selectedTipoValue = signal('');
    selectedSeveridadValue = signal('');
    currentPage = signal(1);
    pageSize = signal(10);

    tipoOptions: AlertaOption[] = [
        { label: 'Todos', value: '' },
        { label: 'Fin de Plan', value: 'FIN_PLAN' },
        { label: 'Sin Ejecución', value: 'SIN_EJECUCION' },
        { label: 'Varianza', value: 'VARIANZA' }
    ];

    severidadOptions: AlertaOption[] = [
        { label: 'Todas', value: '' },
        { label: 'Crítica', value: 'Critica' },
        { label: 'Alta', value: 'Alta' },
        { label: 'Media', value: 'Media' },
        { label: 'Baja', value: 'Baja' }
    ];

    columns: TableColumn[] = [
        { field: 'fecha', header: 'Fecha', type: 'date', width: '110px' },
        { field: 'numeroConvenio', header: 'N° Convenio', width: '130px' },
        { field: 'organizacion', header: 'Organización' },
        { field: 'tipoLabel', header: 'Tipo', width: '150px' },
        { field: 'severidad', header: 'Severidad', type: 'custom', align: 'center', width: '120px' },
        { field: 'mensaje', header: 'Mensaje' }
    ];

    kpis = signal([
        {
            label: 'Fin de Plan',
            value: '0',
            icon: 'event',
            variant: 'warning' as const,
            subtitle: 'Convenios próximos a vencer'
        },
        {
            label: 'Sin Ejecución',
            value: '0',
            icon: 'pause_circle',
            variant: 'danger' as const,
            subtitle: 'Convenios sin ejecución en los últimos meses'
        },
        {
            label: 'Varianzas',
            value: '0',
            icon: 'trending_up',
            variant: 'info' as const,
            subtitle: 'Desviaciones entre programado y ejecutado'
        }
    ]);

    loadData(event?: any): void {
        this.loading.set(true);

        const page = event ? Math.floor(event.first / event.rows) + 1 : this.currentPage();
        const rows = event?.rows ?? this.pageSize();

        this.currentPage.set(page);
        this.pageSize.set(rows);

        const filter: AlertaFilter = {
            tipo: this.selectedTipoValue(),
            severidad: this.selectedSeveridadValue(),
            pagina: page,
            cantidad: rows
        };

        this.alertaRepo.getAlertas(filter).pipe(
            finalize(() => this.loading.set(false))
        ).subscribe({
            next: (res) => {
                this.alertas.set(res.items);
                this.totalRecords.set(res.total);
                this.kpis.set([
                    {
                        label: 'Fin de Plan',
                        value: (res.kpis.kpiFinPlan ?? 0).toString(),
                        icon: 'event',
                        variant: 'warning' as const,
                        subtitle: 'Convenios próximos a vencer'
                    },
                    {
                        label: 'Sin Ejecución',
                        value: (res.kpis.kpiSinEjecucion ?? 0).toString(),
                        icon: 'pause_circle',
                        variant: 'danger' as const,
                        subtitle: 'Convenios sin ejecución en los últimos meses'
                    },
                    {
                        label: 'Varianzas',
                        value: (res.kpis.kpiVarianzas ?? 0).toString(),
                        icon: 'trending_up',
                        variant: 'info' as const,
                        subtitle: 'Desviaciones entre programado y ejecutado'
                    }
                ]);
            },
            error: (err) => {
                this.alertas.set([]);
                this.totalRecords.set(0);
            }
        });
    }

    onFilter(): void {
        this.currentPage.set(1);
        this.loadData();
    }

    getSeveridadStatus(severidad: string): StatusType {
        const map: Record<string, StatusType> = {
            'Critica': 'Crítica',
            'Alta': 'Alta',
            'Media': 'Media',
            'Baja': 'Baja'
        };
        return map[severidad] ?? 'Baja';
    }
}
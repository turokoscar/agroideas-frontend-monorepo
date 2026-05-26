import { StatusType, TableColumn, UiDataTableComponent, UiFilterBarComponent, UiKpiComponent, UiStatusPillComponent } from '@agroideas/ui';
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface Alerta {
    id: number;
    tipo: 'FIN_PLAN' | 'SIN_EJECUCION' | 'VARIANZA';
    tipoLabel: string;
    fecha: string;
    numeroConvenio: string;
    organizacion: string;
    severidad: 'Critica' | 'Alta' | 'Media' | 'Baja';
    mensaje: string;
    convenioId?: number;
}

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
    styleUrls: ['./alertas.page.sass']
})
export class AlertasPageComponent {
    loading = signal(false);
    totalRecords = signal(0);
    alertas = signal<Alerta[]>([]);
    search = signal('');

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

    selectedTipoValue = '';
    selectedSeveridadValue = '';

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

    loadData(event?: any): void {}

    onFilter(): void {
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
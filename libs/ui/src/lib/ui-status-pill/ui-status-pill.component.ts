import { Component, Input } from '@angular/core';

export type StatusType = 'Activo' | 'Suspendido' | 'Finalizado' | 'Abierto' | 'Cerrado' |
                        'Pendiente' | 'Aprobado' | 'Rechazado' | 'Crítica' | 'Alta' | 'Media' | 'Baja';

@Component({
    selector: 'app-ui-status-pill',
    standalone: true,
    imports: [],
    templateUrl: './ui-status-pill.component.html',
    styleUrls: ['./ui-status-pill.component.sass']
})
export class UiStatusPillComponent {
    @Input() text = '';
    @Input() status: StatusType = 'Activo';
    @Input() showIcon = true;

    private labelMap: Record<StatusType, string> = {
        'Activo': 'Activo',
        'Suspendido': 'Suspendido',
        'Finalizado': 'Finalizado',
        'Abierto': 'Abierto',
        'Cerrado': 'Cerrado',
        'Pendiente': 'Pendiente',
        'Aprobado': 'Aprobado',
        'Rechazado': 'Rechazado',
        'Crítica': 'Crítica',
        'Alta': 'Alta',
        'Media': 'Media',
        'Baja': 'Baja'
    };

    get label(): string {
        return this.text || this.labelMap[this.status] || '';
    }
}

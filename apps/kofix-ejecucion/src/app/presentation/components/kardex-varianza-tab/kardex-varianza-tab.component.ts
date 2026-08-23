import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableColumn, UIButtonComponent, UiDataTableComponent } from '@agroideas/ui';
import { formatCurrency } from '@agroideas/utils';
import { Convenio } from '../../../domain/models/convenio.model';
import { KardexConsolidado } from '../../../domain/models/kardex.model';

@Component({
    selector: 'app-kardex-varianza-tab',
    standalone: true,
    imports: [CommonModule, UIButtonComponent, UiDataTableComponent],
    templateUrl: './kardex-varianza-tab.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class KardexVarianzaTabComponent {
    convenio = input.required<Convenio>();
    kardexConsolidado = input.required<KardexConsolidado[]>();
    loadingKardex = input.required<boolean>();

    showHelpGuide = signal(false);

    readonly kardexColumns: TableColumn[] = [
        { field: 'itemDescripcion', header: 'Metas Financieras (Item/Bien)', type: 'custom' },
        { field: 'montoProgramado', header: 'Programado', align: 'right', type: 'custom' },
        { field: 'montoComprometido', header: 'Comprometido (N.O.)', align: 'right', type: 'custom' },
        { field: 'montoEfectivizado', header: 'Ejecutado (Kardex)', align: 'right', type: 'custom' },
        { field: 'montoRendido', header: 'Rendido', align: 'right', type: 'custom' },
        { field: 'saldo', header: 'Saldo Disponible', align: 'right', type: 'custom' },
        { field: 'estado', header: 'Estado', align: 'center', type: 'custom' },
        { field: 'varianza', header: 'Varianza', align: 'center', type: 'custom' }
    ];

    formatCurrency(value?: number): string {
        if (value === undefined) return '-';
        return formatCurrency(value);
    }

    calculateExecutionPercentage(efectivizado: number, programado: number): number {
        if (!programado || programado <= 0) return 0;
        const percentage = (efectivizado / programado) * 100;
        return Math.min(Math.round(percentage), 100);
    }
}

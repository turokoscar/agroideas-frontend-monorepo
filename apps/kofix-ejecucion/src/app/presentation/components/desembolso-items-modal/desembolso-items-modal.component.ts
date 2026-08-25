import { UIModalComponent } from '@agroideas/ui';
import { formatCurrency, formatSolicitudNumber } from '@agroideas/utils';
import { ChangeDetectionStrategy, Component, EventEmitter, OnInit, Output, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DesembolsoRepository } from '../../../domain/repositories/desembolso.repository';
import { Desembolso, DesembolsoDetalleItem } from '../../../domain/models/desembolso.model';

/**
 * Modal de solo lectura: muestra los ítems de una solicitud de desembolso y a qué
 * No Objeción corresponde cada uno, sin abrir el formulario completo de registro.
 */
@Component({
    selector: 'app-desembolso-items-modal',
    standalone: true,
    imports: [CommonModule, UIModalComponent],
    templateUrl: './desembolso-items-modal.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DesembolsoItemsModalComponent implements OnInit {
    desembolso = input.required<Desembolso>();
    @Output() close = new EventEmitter<void>();

    private desembolsoRepo = inject(DesembolsoRepository);

    visible = signal(true);
    loading = signal(true);
    items = signal<DesembolsoDetalleItem[]>([]);

    ngOnInit(): void {
        this.loading.set(true);
        this.desembolsoRepo.getDetalle(this.desembolso().id).subscribe({
            next: (data) => {
                this.items.set(data);
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
            }
        });
    }

    total(): number {
        return this.items().reduce((acc, d) => acc + (d.montoSolicitado || 0), 0);
    }

    formatSolicitudNumber(): string {
        const d = this.desembolso();
        return formatSolicitudNumber(d.numeroSolicitud, d.fechaSolicitud);
    }

    formatCurrency(value: number): string {
        return formatCurrency(value || 0);
    }

    onHide(): void {
        this.visible.set(false);
        this.close.emit();
    }
}

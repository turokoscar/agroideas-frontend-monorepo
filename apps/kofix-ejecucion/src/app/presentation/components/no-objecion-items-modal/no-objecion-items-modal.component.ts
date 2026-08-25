import { UIModalComponent } from '@agroideas/ui';
import { formatCurrency } from '@agroideas/utils';
import { ChangeDetectionStrategy, Component, EventEmitter, OnInit, Output, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NoObjecionRepository } from '../../../domain/repositories/no-objecion.repository';
import { NoObjecion } from '../../../domain/models/no-objecion.model';

/**
 * Modal de solo lectura: muestra rápidamente los ítems de una No Objeción
 * sin abrir el formulario completo de registro/edición.
 */
@Component({
    selector: 'app-no-objecion-items-modal',
    standalone: true,
    imports: [CommonModule, UIModalComponent],
    templateUrl: './no-objecion-items-modal.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class NoObjecionItemsModalComponent implements OnInit {
    noObjecionId = input.required<number>();
    @Output() close = new EventEmitter<void>();

    private noObjecionRepo = inject(NoObjecionRepository);

    visible = signal(true);
    loading = signal(true);
    noObjecion = signal<NoObjecion | null>(null);

    ngOnInit(): void {
        this.loading.set(true);
        this.noObjecionRepo.getById(this.noObjecionId()).subscribe({
            next: (data) => {
                this.noObjecion.set(data);
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
            }
        });
    }

    total(): number {
        return (this.noObjecion()?.detalles ?? []).reduce((acc, d) => acc + (d.montoAdjudicado || 0), 0);
    }

    tipoItemLabel(tipoItemRef: number): string {
        return tipoItemRef === 2 ? 'Servicio' : 'Bien';
    }

    formatCurrency(value: number): string {
        return formatCurrency(value || 0);
    }

    onHide(): void {
        this.visible.set(false);
        this.close.emit();
    }
}

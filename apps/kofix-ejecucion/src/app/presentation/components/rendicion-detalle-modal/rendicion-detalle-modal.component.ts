import { UIModalComponent, UIButtonComponent, UiStatusPillComponent, StatusType } from '@agroideas/ui';
import { AlertService } from '@agroideas/feedback';
import { formatCurrency, formatSolicitudNumber } from '@agroideas/utils';
import { ChangeDetectionStrategy, Component, EventEmitter, OnInit, Output, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RendicionRepository } from '../../../domain/repositories/rendicion.repository';
import { Rendicion, RendicionDetalle } from '../../../domain/models/rendicion.model';

/**
 * Modal de solo lectura: muestra la cabecera, el detalle real por ítem y el
 * comprobante adjunto de una rendición, sin abrir el formulario de registro/edición.
 */
@Component({
    selector: 'app-rendicion-detalle-modal',
    standalone: true,
    imports: [CommonModule, UIModalComponent, UIButtonComponent, UiStatusPillComponent],
    templateUrl: './rendicion-detalle-modal.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RendicionDetalleModalComponent implements OnInit {
    rendicion = input.required<Rendicion>();
    @Output() close = new EventEmitter<void>();

    private rendicionRepo = inject(RendicionRepository);
    private alertService = inject(AlertService);

    visible = signal(true);
    loading = signal(true);
    detalle = signal<RendicionDetalle | null>(null);

    ngOnInit(): void {
        this.loading.set(true);
        this.rendicionRepo.getById(this.rendicion().id).subscribe({
            next: (data) => {
                this.detalle.set(data);
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
            }
        });
    }

    get badgeStatus(): StatusType {
        return this.rendicion().estado === 1 ? 'Activo' : 'Rechazado';
    }

    get badgeText(): string {
        return this.rendicion().estado === 1 ? 'Registrado' : 'Anulado';
    }

    formatSolicitudNumber(): string {
        const r = this.rendicion();
        return formatSolicitudNumber(r.numeroSolicitud, r.fechaEmision);
    }

    formatCurrency(value: number): string {
        return formatCurrency(value || 0);
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

    onHide(): void {
        this.visible.set(false);
        this.close.emit();
    }
}

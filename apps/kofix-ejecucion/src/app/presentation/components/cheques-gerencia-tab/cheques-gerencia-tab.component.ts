import { TableColumn, UIButtonComponent, UiDataTableComponent } from '@agroideas/ui';
import { formatSolicitudNumber } from '@agroideas/utils';
import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs/operators';
import { DesembolsoChequePendiente } from '../../../domain/models/desembolso.model';
import { DesembolsoRepository } from '../../../domain/repositories/desembolso.repository';
import { ActivarChequeModalComponent } from '../activar-cheque-modal/activar-cheque-modal.component';

/**
 * Pestaña "Cheques de Gerencia" del espacio de Ejecución: bandeja del Supervisor de Monitoreo con
 * los cheques del convenio en DEVENGADO, para activarlos (pasarlos a GIRADO) con la contrapartida
 * (ADR-020). El cheque es por ítem de la solicitud. Antes era una sección dentro de Desembolsos.
 * Solo se muestra con el permiso ACTIVAR_CHEQUES (lo decide `EjecucionDetailPageComponent`).
 */
@Component({
    selector: 'app-cheques-gerencia-tab',
    standalone: true,
    imports: [CommonModule, UiDataTableComponent, UIButtonComponent, ActivarChequeModalComponent],
    templateUrl: './cheques-gerencia-tab.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChequesGerenciaTabComponent implements OnInit {
    convenioId = input.required<number>();

    private desembolsoRepo = inject(DesembolsoRepository);

    chequesPendientes = signal<DesembolsoChequePendiente[]>([]);
    loading = signal<boolean>(false);
    /** La carga falló: la tabla lo dice en vez de mostrar "Sin cheques pendientes". */
    loadError = signal<boolean>(false);
    showActivarChequeModal = signal<boolean>(false);
    activandoCheque = signal<DesembolsoChequePendiente | undefined>(undefined);

    readonly columns: TableColumn[] = [
        { field: 'correlativo', header: 'Correlativo', width: '140px' },
        { field: 'numeroSolicitud', header: 'N° Memorándum AGROIDEAS', type: 'custom', width: '170px' },
        { field: 'itemNombre', header: 'Ítem' },
        { field: 'fechaDevengado', header: 'Devengado el', type: 'date', width: '110px', align: 'center' },
        { field: 'monto', header: 'Monto', type: 'currency', align: 'right', width: '140px' },
        { field: 'observacion', header: 'Observación', width: '200px' }
    ];

    /** N° Memorándum con el formato numero-año (p. ej. 0055-2026), igual que en Desembolsos. */
    formatSolicitudNumber(row: DesembolsoChequePendiente): string {
        return formatSolicitudNumber(row.numeroSolicitud, row.fechaSolicitud);
    }

    ngOnInit(): void {
        this.loadChequesPendientes();
    }

    loadChequesPendientes(): void {
        if (!this.convenioId()) return;
        this.loading.set(true);
        this.desembolsoRepo.getChequesPendientesActivacion(this.convenioId())
            .pipe(finalize(() => this.loading.set(false)))
            .subscribe({
                next: (items) => {
                    this.loadError.set(false);
                    this.chequesPendientes.set(items);
                },
                error: () => {
                    this.loadError.set(true);
                    this.chequesPendientes.set([]);
                }
            });
    }

    abrirActivarChequeModal(cheque: DesembolsoChequePendiente): void {
        this.activandoCheque.set(cheque);
        this.showActivarChequeModal.set(true);
    }

    handleActivarChequeModalClose(refresh: boolean): void {
        this.showActivarChequeModal.set(false);
        if (refresh) {
            this.loadChequesPendientes();
        }
    }
}

import { AlertService } from '@agroideas/feedback';
import { UIButtonComponent, UIModalComponent, UiFileChipComponent } from '@agroideas/ui';
import { formatCurrency } from '@agroideas/utils';
import { ChangeDetectionStrategy, Component, EventEmitter, OnInit, Output, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { NoObjecionDetSaldo, NoObjecionRebajaSaldo } from '../../../domain/models/no-objecion.model';
import { NoObjecionRepository } from '../../../domain/repositories/no-objecion.repository';

export type ModoRebaja = 'parcial' | 'total';

/**
 * ADR 0012 Fase 4 (INC-04): rebaja del saldo NO solicitado de una No Objeción.
 * - "Rebajar": parcial, en unidades enteras (monto = unidades × precio de la N.O.).
 * - "Anular saldo": todo el saldo no solicitado; la N.O. queda en lo solicitado (cerrada).
 * Lo rebajado vuelve al saldo disponible de la meta. Sustento: carta de la organización.
 * Las reglas (tope, unidades rebajables) las valida la API; aquí solo se guía al usuario.
 */
@Component({
    selector: 'app-no-objecion-rebaja-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, UIModalComponent, UIButtonComponent, UiFileChipComponent],
    templateUrl: './no-objecion-rebaja-modal.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class NoObjecionRebajaModalComponent implements OnInit {
    noObjecionId = input.required<number>();
    /** Emite true si se registró una rebaja (la lista debe recargarse). */
    @Output() closed = new EventEmitter<boolean>();

    private repo = inject(NoObjecionRepository);
    private alertService = inject(AlertService);

    visible = signal(true);
    loading = signal(true);
    isSubmitting = signal(false);

    saldo = signal<NoObjecionRebajaSaldo | null>(null);
    selectedDetId = signal<number | null>(null);
    modo = signal<ModoRebaja>('parcial');
    unidades = signal<number | null>(null);
    numeroCarta = signal('');
    fechaCarta = signal('');
    motivo = signal('');

    selectedFile = signal<File | null>(null);
    uploadingFile = signal(false);
    fileUrl = signal<string | null>(null);

    readonly hoy = new Date().toISOString().slice(0, 10);

    detallesConSaldo = computed(() => (this.saldo()?.detalles ?? []).filter(d => d.saldoNoSolicitado > 0));

    detalle = computed<NoObjecionDetSaldo | undefined>(() =>
        this.saldo()?.detalles.find(d => d.noObjecionDetId === this.selectedDetId()));

    minFechaCarta = computed(() => {
        const f = this.saldo()?.fechaDocumento;
        return f ? String(f).slice(0, 10) : '';
    });

    /** Monto que se rebajará según el modo. */
    montoRebaja = computed(() => {
        const det = this.detalle();
        if (!det) return 0;
        if (this.modo() === 'total') return det.saldoNoSolicitado;
        const u = this.unidades() ?? 0;
        return Math.round(u * det.precioUnitario * 100) / 100;
    });

    unidadesValidas = computed(() => {
        if (this.modo() === 'total') return true;
        const u = this.unidades();
        const max = this.detalle()?.unidadesRebajables ?? 0;
        return u !== null && Number.isInteger(u) && u >= 1 && u <= max;
    });

    canSave = computed(() =>
        (this.detalle()?.saldoNoSolicitado ?? 0) > 0 && this.unidadesValidas()
        && !!this.numeroCarta().trim() && !!this.fechaCarta() && !!this.fileUrl() && !!this.motivo().trim()
        && !this.uploadingFile());

    ngOnInit(): void {
        this.repo.getSaldoRebaja(this.noObjecionId()).pipe(finalize(() => this.loading.set(false))).subscribe({
            next: (saldo) => {
                this.saldo.set(saldo);
                const primero = saldo.detalles.find(d => d.saldoNoSolicitado > 0);
                if (primero) this.selectedDetId.set(primero.noObjecionDetId);
            },
            error: (err) => {
                this.alertService.show('Error', err?.error?.mensaje || 'No se pudo obtener el saldo de la No Objeción.', 'error');
                this.onHide();
            }
        });
    }

    setModo(modo: ModoRebaja): void {
        this.modo.set(modo);
        if (modo === 'total') this.unidades.set(null);
    }

    onFileSelected(event: Event): void {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;
        if (file.type !== 'application/pdf') {
            this.alertService.show('Formato no válido', 'Solo se permiten archivos PDF.', 'warning');
            return;
        }

        this.selectedFile.set(file);
        this.uploadingFile.set(true);
        // Mismo flujo que el documento de la N.O.: se sube a sel-api-archivos y se guarda el identificador.
        this.repo.uploadFile(file).pipe(finalize(() => this.uploadingFile.set(false))).subscribe({
            next: (res) => this.fileUrl.set(res.fileUrl),
            error: (err) => {
                this.selectedFile.set(null);
                this.alertService.show('Error', err?.error?.mensaje || 'No se pudo subir la carta de la organización.', 'error');
            }
        });
    }

    removeFile(): void {
        this.selectedFile.set(null);
        this.fileUrl.set(null);
    }

    formatCurrency(value: number | undefined): string {
        return formatCurrency(value ?? 0);
    }

    save(): void {
        const det = this.detalle();
        const archivoUrl = this.fileUrl();
        if (!det || !archivoUrl || !this.canSave()) return;

        const total = this.modo() === 'total';
        const titulo = total ? '¿Anular el saldo de la No Objeción?' : '¿Registrar la rebaja?';
        const texto = `Se rebajarán ${this.formatCurrency(this.montoRebaja())} de "${det.itemNombre ?? 'ítem'}"`
            + ` (${det.proveedorNombre ?? 'proveedor'}). La No Objeción quedará en ${this.formatCurrency(det.montoVigente - this.montoRebaja())}`
            + ` y el monto volverá al saldo disponible de la meta. Esta acción no se puede deshacer.`;

        this.alertService.confirm(titulo, texto).then((result: { isConfirmed: boolean }) => {
            if (!result.isConfirmed) return;

            this.isSubmitting.set(true);
            this.repo.registrarRebaja(this.noObjecionId(), {
                noObjecionDetId: det.noObjecionDetId,
                total,
                unidades: total ? undefined : (this.unidades() ?? undefined),
                numeroCarta: this.numeroCarta().trim(),
                fechaCarta: this.fechaCarta(),
                archivoUrl,
                motivo: this.motivo().trim()
            }).pipe(finalize(() => this.isSubmitting.set(false))).subscribe({
                next: (res: { mensaje?: string }) => {
                    this.alertService.toast(res?.mensaje || (total ? 'Saldo anulado con éxito.' : 'Rebaja registrada con éxito.'));
                    this.onHide(true);
                },
                error: (err) => {
                    this.alertService.show('Error', err?.error?.mensaje || 'No se pudo registrar la rebaja.', 'error');
                }
            });
        });
    }

    onHide(refresh = false): void {
        this.visible.set(false);
        this.closed.emit(refresh);
    }
}

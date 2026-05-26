import { UIModalComponent } from '@agroideas/ui';
import { AlertService } from '@agroideas/feedback';
import { Component, Output, EventEmitter, OnInit, inject, signal, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ProgramacionRepository } from '../../../domain/repositories/programacion.repository';
import { SaveProgramacionUseCase } from '../../../domain/usecases/programacion/save-programacion.usecase';
import { ProgramacionItem, DetalleCronograma } from '../../../domain/models/programacion.model';

/**
 * ProgramacionCronogramaModalComponent
 * Modal de programación mensual de un ítem del Marco Lógico.
 * Reutilizable: requiere solo el ítem y las fechas del convenio.
 *
 * Uso:
 *  <app-programacion-cronograma-modal
 *      [item]="selectedItem"
 *      [fechaInicio]="convenio.fechaInicio"
 *      [fechaFin]="convenio.fechaFin"
 *      (close)="onClose()"
 *      (saved)="onSaved()">
 *  </app-programacion-cronograma-modal>
 */


@Component({
    selector: 'app-programacion-cronograma-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, UIModalComponent],
    templateUrl: './programacion-cronograma-modal.component.html'
})
export class ProgramacionCronogramaModalComponent implements OnInit {
    item = input.required<ProgramacionItem>();
    fechaInicio = input.required<string>();
    fechaFin = input.required<string>();
    readOnly = input<boolean>(false);
    @Output() close = new EventEmitter<void>();
    @Output() saved = new EventEmitter<void>();

    private alertService = inject(AlertService);
    private saveUseCase = inject(SaveProgramacionUseCase);
    private programacionRepo = inject(ProgramacionRepository);

    visible = signal(true);
    loading = signal(true);
    saving = signal(false);

    meses = signal<DetalleCronograma[]>([]);

    // Totales reactivos: se recalculan automáticamente al cambiar cualquier celda
    totalProgramadoFisico = computed(() =>
        this.meses().reduce((acc, m) => acc + (m.metaFisica || 0), 0)
    );
    totalProgramadoFinanciero = computed(() =>
        this.meses().reduce((acc, m) => acc + (m.metaFinanciera || 0), 0)
    );

    restanteFisico = computed(() => {
        const meta = this.item().metaAprobada ?? this.item().metaFisica;
        return meta - this.totalProgramadoFisico();
    });
    restanteFinanciero = computed(() => {
        const monto = this.item().montoAprobado ?? this.item().metaFinanciera;
        return monto - this.totalProgramadoFinanciero();
    });

    agroideasPrecioUnitario = computed(() => {
        const it = this.item();
        const meta = it.metaAprobada ?? it.metaFisica;
        const monto = it.montoAprobado ?? it.metaFinanciera;
        return meta > 0 ? monto / meta : 0;
    });

    // Botón habilitado solo cuando el total programado == monto aprobado (con tolerancia)
    canSave = computed(() => {
        const monto = this.item().montoAprobado ?? this.item().metaFinanciera;
        const programado = this.totalProgramadoFinanciero();
        return monto > 0 && Math.abs(programado - monto) <= monto * 0.00001;
    });

    ngOnInit(): void {
        this.initCronograma();
        this.loadData();
    }

    initCronograma(): void {
        const start = new Date(this.fechaInicio());
        const end = new Date(this.fechaFin());
        let monthsCount = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
        if (monthsCount > 36) monthsCount = 36;
        if (monthsCount < 1) monthsCount = 1;

        const initialMeses = Array.from({ length: monthsCount }, (_, i) => {
            const date = new Date(start);
            date.setMonth(start.getMonth() + i + 1);
            return {
                mes: i + 1,
                metaFisica: 0,
                metaFinanciera: 0,
                fecha: this.getFechaLabel(date)
            };
        });
        this.meses.set(initialMeses);
    }

    private getFechaLabel(date: Date): string {
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        return `${months[date.getMonth()]} ${date.getFullYear()}`;
    }

    loadData(): void {
        this.loading.set(true);
        this.programacionRepo.getCronograma(this.item().id).subscribe({
            next: (detalles) => {
                const currentMeses = [...this.meses()];
                detalles.forEach(d => {
                    const m = currentMeses.find(m => m.mes === d.mes);
                    if (m) {
                        m.metaFisica = d.metaFisica;
                        m.metaFinanciera = d.metaFinanciera;
                    }
                });
                this.meses.set(currentMeses);
                this.calculateTotals();
                this.loading.set(false);
            },
            error: () => { this.loading.set(false); }
        });
    }

    calculateTotals(): void {}

    onFisicaChange(mes: DetalleCronograma, newValue: number): void {
        const it = this.item();
        const meta = it.metaAprobada ?? it.metaFisica;
        const monto = it.montoAprobado ?? it.metaFinanciera;
        // Asignar el nuevo valor (ya viene actualizado desde ngModelChange)
        mes.metaFisica = newValue ?? 0;
        mes.metaFinanciera = meta > 0 ? (mes.metaFisica / meta) * monto : 0;
        // Nuevo array → los computed() detectan el cambio y recalculan los tiles
        this.meses.update(arr => [...arr]);
    }

    save(): void {
        const it = this.item();
        const meta = it.metaAprobada ?? it.metaFisica;
        const monto = it.montoAprobado ?? it.metaFinanciera;
        if (this.totalProgramadoFisico() > meta * 1.00001) {
            this.alertService.show('Límite Excedido', 'La meta física total no puede exceder el límite del ítem.', 'warning');
            return;
        }
        if (this.totalProgramadoFinanciero() > monto * 1.00001) {
            this.alertService.show('Límite Excedido', 'El monto financiero no puede exceder el aporte de AGROIDEAS.', 'warning');
            return;
        }

        this.saving.set(true);
        this.saveUseCase.execute({
            marcoLogicoId: it.id,
            postulanteId: it.postulanteID!,
            detalles: this.meses()
                .filter(m => m.metaFisica > 0)
                .map(m => ({ mes: m.mes, metaFisica: m.metaFisica, metaFinanciera: m.metaFinanciera }))
        }).subscribe({
            next: (res) => {
                if (res?.exitoso !== false) {
                    this.alertService.toast(res?.mensaje || 'Programación guardada.');
                    this.saved.emit();
                    this.onHide();
                } else {
                    this.alertService.showResponse(res);
                    this.saving.set(false);
                }
            },
            error: (err) => {
                this.alertService.show('Error', err.error?.mensaje || 'Ocurrió un error al guardar la programación.', 'error');
                this.saving.set(false);
            }
        });
    }

    onHide(): void {
        this.visible.set(false);
        this.close.emit();
    }

    formatCurrency(value: number): string {
        return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value);
    }
}



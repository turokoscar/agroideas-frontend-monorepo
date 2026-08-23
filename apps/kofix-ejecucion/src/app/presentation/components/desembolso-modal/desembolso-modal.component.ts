import { AlertService } from '@agroideas/feedback';
import { UIButtonComponent, UIModalComponent } from '@agroideas/ui';
import { ChangeDetectionStrategy, Component, Output, EventEmitter, OnInit, computed, inject, signal, input } from '@angular/core';
import { formatConvenioNumber } from '@agroideas/utils';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, DecimalPipe } from '@angular/common';
import { DesembolsoRepository } from '../../../domain/repositories/desembolso.repository';
import { NoObjecionRepository } from '../../../domain/repositories/no-objecion.repository';
import { CatalogoRepository } from '../../../domain/repositories/catalogo.repository';
import { CatalogoItem } from '../../../domain/models/catalogo.model';
import { ConvenioStateService } from '../../../shared/services/convenio-state.service';

@Component({
    selector: 'app-desembolso-modal',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, DecimalPipe, UIModalComponent, UIButtonComponent],
    templateUrl: './desembolso-modal.component.html',
    styleUrls: ['./desembolso-modal.component.sass'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DesembolsoModalComponent implements OnInit {
    convenioId = input.required<number>();
    @Output() onClose = new EventEmitter<boolean>();

    visible = signal(true);
    isSubmitting = signal(false);
    loadingItems = signal(false);
    itemsDisponibles = signal<any[]>([]);
    originalItemsDisponibles = signal<any[]>([]);
    filterTipoItem = signal<number>(0); // 0: Todos, 1: Bien, 2: Servicio
    tiposPago = signal<CatalogoItem[]>([]);

    private fb = inject(FormBuilder);
    private alertService = inject(AlertService);
    private noObjecionRepo = inject(NoObjecionRepository);
    private stateService = inject(ConvenioStateService);
    private desembolsoRepo = inject(DesembolsoRepository);
    private catalogoRepo = inject(CatalogoRepository);

    readonly convenioSubtitle = computed(() => {
        const c = this.stateService.convenio();
        if (!c) return '';
        return `${formatConvenioNumber(c.numeroConvenio, c.fechaInicio)} · ${c.razonSocial}`;
    });

    form: FormGroup = this.fb.group({
        numeroSolicitud: ['', Validators.required],
        tipoPagoId: ['', Validators.required],
        fechaDesembolso: [new Date().toISOString().substring(0, 10), Validators.required],
        observacion: [''],
        items: this.fb.array([], Validators.required)
    });

    get itemsFormArray() {
        return this.form.get('items') as FormArray;
    }

    ngOnInit(): void {
        this.loadItemsDisponibles();
        this.loadTiposPago();
    }

    private loadTiposPago(): void {
        this.catalogoRepo.getByGrupo('TIPO_PAGO').subscribe({
            next: (data: any) => { this.tiposPago.set(data); },
            error: (err: any) => { /* Error handled by AlertService or removed */ }
        });
    }

    private loadItemsDisponibles(): void {
        this.loadingItems.set(true);
        this.noObjecionRepo.getItemsParaDesembolso(this.convenioId()).subscribe({
            next: (data: any) => { 
                this.originalItemsDisponibles.set(data);
                this.applyFilters();
                this.loadingItems.set(false); 
            },
            error: () => { this.loadingItems.set(false); }
        });
    }

    applyFilters(): void {
        const type = Number(this.filterTipoItem());
        if (type === 0) {
            this.itemsDisponibles.set([...this.originalItemsDisponibles()]);
        } else {
            this.itemsDisponibles.set(this.originalItemsDisponibles().filter(i => i.idTipoItem === type));
        }
    }

    addItem(): void {
        const itemGroup = this.fb.group({
            itemAdjudicadoId: ['', Validators.required],
            noObjecionCodigo: [''],
            proveedorNombre: [''],
            itemNombre: [''],
            montoTotal: [0],
            saldoDisponible: [0],
            montoSolicitado: [0, [Validators.required, Validators.min(0.01)]],
            observacion: ['']
        });

        this.itemsFormArray.push(itemGroup);
    }

    /** Ítems disponibles para el dropdown de la fila `currentIndex`: excluye los ya elegidos en otras filas. */
    getAvailableItems(currentIndex: number): any[] {
        const currentControl = this.itemsFormArray.at(currentIndex);
        const selectedId = currentControl.get('itemAdjudicadoId')?.value;
        const otherSelectedIds = this.itemsFormArray.controls
            .map((c, idx) => idx !== currentIndex ? c.get('itemAdjudicadoId')?.value : null)
            .filter(id => id);

        return this.itemsDisponibles().filter(item => item.id == selectedId || !otherSelectedIds.some(id => id == item.id));
    }

    onItemChange(index: number): void {
        const control = this.itemsFormArray.at(index);
        const selectedId = control.get('itemAdjudicadoId')?.value;
        const item = this.itemsDisponibles().find(i => i.id == selectedId);
        if (!item) return;

        control.patchValue({
            noObjecionCodigo: item.noObjecionCodigo,
            proveedorNombre: item.proveedorNombre,
            itemNombre: item.itemNombre,
            montoTotal: item.montoAdjudicado,
            saldoDisponible: item.saldoDisponible,
            montoSolicitado: item.saldoDisponible
        });

        const montoControl = control.get('montoSolicitado');
        montoControl?.setValidators([Validators.required, Validators.min(0.01), Validators.max(item.saldoDisponible)]);
        montoControl?.updateValueAndValidity();
    }

    removeItem(index: number): void {
        this.itemsFormArray.removeAt(index);
    }

    totalSolicitado(): number {
        return this.itemsFormArray.controls.reduce((acc, curr) => acc + (Number(curr.value.montoSolicitado) || 0), 0);
    }

    save(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            if (this.itemsFormArray.length === 0) {
                this.alertService.toast('Debe agregar al menos un ítem a la solicitud.');
            }
            return;
        }

        this.isSubmitting.set(true);
        const v = this.form.value;

        this.desembolsoRepo.registrar({
            postulanteId: Number(this.convenioId()),
            numeroSolicitud: v.numeroSolicitud,
            tipoPagoId: Number(v.tipoPagoId),
            fechaDesembolso: v.fechaDesembolso,
            observacion: v.observacion || undefined,
            items: v.items.map((i: any) => ({
                itemAdjudicadoId: i.itemAdjudicadoId,
                montoSolicitado: i.montoSolicitado,
                observacion: i.observacion
            }))
        }).subscribe({
            next: (res: any) => {
                this.isSubmitting.set(false);
                if (res?.exitoso !== false) {
                    this.stateService.refresh(this.convenioId());
                    this.alertService.toast('Solicitud de desembolso registrada correctamente.');
                    this.onHide(true);
                } else {
                    this.alertService.showResponse(res);
                }
            },
            error: (err: any) => {
                this.isSubmitting.set(false);
                let errorMsg = 'No se pudo registrar la solicitud.';
                
                if (err.error?.mensaje) {
                    errorMsg = err.error.mensaje;
                } else if (err.error?.errors) {
                    // Extract FluentValidation / ASP.NET errors
                    const errors = err.error.errors;
                    errorMsg = Object.keys(errors).map(key => errors[key].join(', ')).join('. ');
                }
                
                this.alertService.show('Error', errorMsg, 'error');
            }
        });
    }

    onHide(refresh = false): void {
        this.visible.set(false);
        this.onClose.emit(refresh);
    }
}



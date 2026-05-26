import { AlertService } from '@agroideas/feedback';
import { UIButtonComponent, UIModalComponent } from '@agroideas/ui';
import { Component, Output, EventEmitter, OnInit, inject, signal, input } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule, DecimalPipe } from '@angular/common';
import { DesembolsoRepository } from '../../../domain/repositories/desembolso.repository';
import { RegistrarDesembolsoUseCase } from '../../../domain/usecases/desembolso/registrar-desembolso.usecase';
import { NoObjecionRepository } from '../../../domain/repositories/no-objecion.repository';
import { CatalogoRepository } from '../../../domain/repositories/catalogo.repository';
import { CatalogoItem } from '../../../domain/models/catalogo.model';
import { ConvenioStateService } from '../../../shared/services/convenio-state.service';

@Component({
    selector: 'app-desembolso-modal',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormsModule, DecimalPipe, UIModalComponent, UIButtonComponent],
    templateUrl: './desembolso-modal.component.html',
    styleUrls: ['./desembolso-modal.component.sass']
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
    selectedItemToAdd = signal<any>(null);

    private fb = inject(FormBuilder);
    private alertService = inject(AlertService);
    private noObjecionRepo = inject(NoObjecionRepository);
    private registerUseCase = inject(RegistrarDesembolsoUseCase);
    private stateService = inject(ConvenioStateService);
    private desembolsoRepo = inject(DesembolsoRepository);
    private catalogoRepo = inject(CatalogoRepository);

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
            error: (err: any) => { console.error('Error loading payment types', err); }
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
        const item = this.selectedItemToAdd();
        if (!item) return;

        // Verificar si ya existe en la lista para no duplicar
        const exists = this.itemsFormArray.controls.some(c => c.value.itemAdjudicadoId === item.id);
        if (exists) {
            this.alertService.toast('Este ítem ya ha sido agregado a la solicitud.');
            return;
        }

        const itemGroup = this.fb.group({
            itemAdjudicadoId: [item.id],
            noObjecionCodigo: [item.noObjecionCodigo],
            proveedorNombre: [item.proveedorNombre],
            itemNombre: [item.itemNombre],
            montoTotal: [item.montoAdjudicado],
            saldoDisponible: [item.saldoDisponible],
            montoSolicitado: [item.saldoDisponible, [Validators.required, Validators.min(0.01), Validators.max(item.saldoDisponible)]],
            observacion: ['']
        });

        this.itemsFormArray.push(itemGroup);
        this.selectedItemToAdd.set(null);
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

        this.registerUseCase.execute({
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



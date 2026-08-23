import { AlertService } from '@agroideas/feedback';
import { UIButtonComponent, UIModalComponent, UiFileChipComponent } from '@agroideas/ui';
import { formatConvenioNumber } from '@agroideas/utils';
import { ChangeDetectionStrategy, Component, Input, OnInit, Output, EventEmitter, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { CommonModule, DecimalPipe } from '@angular/common';
import { NoObjecionRepository } from '../../../domain/repositories/no-objecion.repository';
import { CatalogoRepository } from '../../../domain/repositories/catalogo.repository';
import { FileStorageService } from '../../../shared/services/file-storage.service';
import { CatalogoItem } from '../../../domain/models/catalogo.model';
import { NoObjecionProgrammedItem } from '../../../domain/models/no-objecion-programmed-item.model';
import { NoObjecionBalance } from '../../../domain/models/no-objecion.model';
import { ConvenioStateService } from '../../../shared/services/convenio-state.service';

@Component({
    selector: 'app-no-objecion-modal',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, ReactiveFormsModule, DecimalPipe, UIModalComponent, UIButtonComponent, UiFileChipComponent],
    templateUrl: './no-objecion-modal.component.html',
    styleUrls: ['./no-objecion-modal.component.sass']
})
export class NoObjecionModalComponent implements OnInit {
    @Input() convenioId!: number;
    @Input() mode: 'create' | 'edit' | 'view' = 'create';
    @Input() noObjecionId?: number;
    @Output() onClose = new EventEmitter<boolean>();

    private alertService = inject(AlertService);
    private fb = inject(FormBuilder);
    private noObjecionRepo = inject(NoObjecionRepository);
    private catalogoRepo = inject(CatalogoRepository);
    private fileStorageService = inject(FileStorageService);
    private convenioStateService = inject(ConvenioStateService);

    readonly convenioSubtitle = computed(() => {
        const c = this.convenioStateService.convenio();
        if (!c) return '';
        return `${formatConvenioNumber(c.numeroConvenio, c.fechaInicio)} · ${c.razonSocial}`;
    });

    visible = signal(true);
    noObjecionForm: FormGroup;
    selectedFile = signal<File | null>(null);
    isSubmitting = signal(false);
    loadingItems = signal(false);
    programmedItems = signal<NoObjecionProgrammedItem[]>([]);
    tiposDocumento = signal<CatalogoItem[]>([]);
    balances = signal<Record<string, NoObjecionBalance>>({});

    constructor() {
        this.noObjecionForm = this.fb.group({
            tipoDocumento: ['', Validators.required],
            numeroDocumento: ['', [
                Validators.required, 
                Validators.pattern(/^\d+$/)
            ]],
            fechaDocumento: ['', Validators.required],
            archivoUrl: [''],
            observacion: [''],
            items: this.fb.array([])
        });
    }

    ngOnInit(): void {
        this.loadCatalogos();
        if (this.mode === 'edit' || this.mode === 'view') {
            this.loadNoObjecionForEdit();
        } else {
            this.loadUnifiedItems().then(() => this.addItem());
        }
    }

    private loadNoObjecionForEdit(): void {
        if (!this.noObjecionId) return;
        this.noObjecionRepo.getById(this.noObjecionId).subscribe({
            next: (data) => {
                const itemIds = data.detalles.map(d => d.itemMlId);
                this.loadUnifiedItems(itemIds).then(() => {
                    this.populateFormWithNoObjecion(data);
                });
            }
        });
    }

    private populateFormWithNoObjecion(data: any): void {
        const numDoc = data.numeroDocumento;
        const plainNumber = numDoc && numDoc.includes('-') ? parseInt(numDoc.split('-')[0], 10).toString() : numDoc;

        this.noObjecionForm.patchValue({
            tipoDocumento: data.tipoDocumentoId,
            numeroDocumento: plainNumber,
            fechaDocumento: typeof data.fechaDocumento === 'string' ? data.fechaDocumento.split('T')[0] : data.fechaDocumento,
            archivoUrl: data.archivoUrl,
            observacion: data.observacion
        });

        const itemsArray = this.items;
        while (itemsArray.length !== 0) {
            itemsArray.removeAt(0);
        }

        data.detalles.forEach((det: any) => {
            const itemForm = this.fb.group({
                itemId: [det.itemMlId, Validators.required],
                itemNombre: [{ value: '', disabled: true }],
                cantidad: [det.cantidad, [Validators.required, Validators.min(0.00001)]],
                montoAdjudicado: [det.montoAdjudicado, [Validators.required, Validators.min(0.01)]],
                rucProveedor: [det.rucProveedor, [Validators.required, Validators.pattern(/^[0-9]{11}$/)]],
                razonSocialProveedor: [det.razonSocialProveedor, Validators.required]
            });

            const itemObj = this.programmedItems().find(i => i.id == det.itemMlId);
            if (itemObj) {
                itemForm.get('itemNombre')?.setValue(itemObj.nombre);
            } else if (det.itemNombre) {
                itemForm.get('itemNombre')?.setValue(det.itemNombre);
            }

            if (this.mode === 'view') {
                itemForm.disable();
            }

            itemsArray.push(itemForm);
        });

        if (this.mode === 'view') {
            this.noObjecionForm.disable();
        }
    }

    private loadUnifiedItems(includeItemIds?: number[]): Promise<void> {
        return new Promise((resolve) => {
            if (!this.convenioId) {
                resolve();
                return;
            }
            this.loadingItems.set(true);
            this.noObjecionRepo.getProgrammedItemsWithBalance(this.convenioId, includeItemIds).subscribe({
                next: (items) => {
                    this.programmedItems.set(items);
                    const currentBalances = { ...this.balances() };
                    items.forEach(it => {
                        currentBalances[it.id] = {
                            montoComprometido: it.montoComprometido,
                            cantidadComprometida: it.cantidadComprometida
                        };
                    });
                    this.balances.set(currentBalances);
                    this.loadingItems.set(false);
                    resolve();
                },
                error: () => {
                    this.loadingItems.set(false);
                    resolve();
                }
            });
        });
    }

    loadCatalogos() {
        this.catalogoRepo.getByGrupo('TIPO_DOCUMENTO').subscribe({
            next: (res) => {
                this.tiposDocumento.set(res);
            }
        });
    }

    getAvailableItems(currentIndex: number): NoObjecionProgrammedItem[] {
        const currentItemControl = this.items.at(currentIndex);
        const selectedItemId = currentItemControl.get('itemId')?.value;
        const otherSelectedIds = this.items.controls
            .map((c, idx) => idx !== currentIndex ? c.get('itemId')?.value : null)
            .filter(id => id);

        return this.programmedItems().filter(item => {
            if (item.id == selectedItemId) return true;
            if (otherSelectedIds.includes(item.id)) return true;
            const saldoFisico = item.saldoFisico ?? 0;
            const saldoFinanciero = item.saldoFinanciero ?? 0;
            let consumidoEnForm = 0;
            this.items.controls.forEach((ctrl, idx) => {
                if (idx !== currentIndex && ctrl.get('itemId')?.value == item.id) {
                    consumidoEnForm += ctrl.get('cantidad')?.value || 0;
                }
            });
            return (saldoFisico - consumidoEnForm) > 0 || saldoFinanciero > 0;
        });
    }

    get items() {
        return this.noObjecionForm.get('items') as FormArray;
    }

    addItem() {
        const itemForm = this.fb.group({
            itemId: ['', Validators.required],
            itemNombre: [{ value: '', disabled: true }],
            cantidad: [1, [Validators.required, Validators.min(1)]],
            montoAdjudicado: [0, [Validators.required, Validators.min(0.01)]],
            rucProveedor: ['', [Validators.required, Validators.pattern(/^[0-9]{11}$/)]],
            razonSocialProveedor: ['', Validators.required]
        });
        this.items.push(itemForm);
    }

    onItemChange(index: number) {
        const control = this.items.at(index);
        const selectedId = control.get('itemId')?.value;
        const itemObj = this.programmedItems().find(i => i.id == selectedId);

        if (itemObj) {
            control.patchValue({
                itemNombre: itemObj.nombre,
                cantidad: itemObj.saldoFisico ?? 0,
                montoAdjudicado: itemObj.saldoFinanciero ?? 0
            });
        }
    }

    onCantidadChange(index: number) {
        const control = this.items.at(index);
        const selectedId = control.get('itemId')?.value;
        const itemObj = this.programmedItems().find(i => i.id == selectedId);
        const newCantidad = control.get('cantidad')?.value || 0;

        if (itemObj && itemObj.metaFisica > 0) {
            const proportionalAmount = (newCantidad / itemObj.metaFisica) * itemObj.aporteAgroideas;
            control.patchValue({
                montoAdjudicado: Number(proportionalAmount.toFixed(2))
            });
        }
    }

    getDropdownItems(currentIndex: number): NoObjecionProgrammedItem[] {
        if (this.mode === 'view') return this.getViewItems();
        return this.getAvailableItems(currentIndex);
    }

    getProgrammedItem(id: any): NoObjecionProgrammedItem | undefined {
        return this.programmedItems().find(p => p.id == id);
    }

    getViewItems(): NoObjecionProgrammedItem[] {
        const usedIds = this.items.controls.map(c => c.get('itemId')?.value).filter(id => id);
        const result = this.programmedItems().filter(p => usedIds.includes(p.id));
        const missingIds = usedIds.filter((id: any) => !result.some(r => r.id == id));
        missingIds.forEach((id: any) => {
            const ctrl = this.items.controls.find(c => c.get('itemId')?.value == id);
            if (ctrl) {
                result.push({
                    id: id,
                    codigo: '',
                    nombre: ctrl.get('itemNombre')?.value || `Ítem ${id}`,
                    metaFisica: 0,
                    aporteAgroideas: 0,
                    cantidadComprometida: 0,
                    montoComprometido: 0,
                    saldoFisico: 0,
                    saldoFinanciero: 0
                });
            }
        });
        return result;
    }

    removeItem(index: number) {
        this.items.removeAt(index);
    }

    onFileSelected(event: any) {
        const file = event.target.files[0];
        if (!file) return;

        const validation = this.fileStorageService.validateFile(file);
        if (!validation.valid) {
            this.alertService.show('Archivo inválido', validation.error!, 'error');
            return;
        }
        this.selectedFile.set(file);
    }

    calculateTotal(): number {
        return this.items.controls.reduce((acc: number, control: any) => {
            const monto = control.get('montoAdjudicado')?.value || 0;
            return acc + monto;
        }, 0);
    }

    close(refresh = false) {
        this.visible.set(false);
        this.onClose.emit(refresh);
    }

    save() {
        if (this.noObjecionForm.invalid) {
            this.noObjecionForm.markAllAsTouched();
            this.alertService.show('Formulario Incompleto', 'Por favor, verifique los campos obligatorios del formulario.', 'warning');
            return;
        }

        const items = this.items.value;
        const itemIds = items.map((i: any) => i.itemId);

        const hasDuplicates = itemIds.some((id: any, index: number) => itemIds.indexOf(id) !== index);
        if (hasDuplicates) {
            this.alertService.toast('No se permiten ítems duplicados en el detalle.', 'warning');
            return;
        }

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const progItem = this.programmedItems().find(p => p.id == item.itemId);
            if (progItem) {
                if (item.cantidad <= 0 || item.montoAdjudicado <= 0) {
                    this.alertService.toast(`Valores inválidos en el ítem [${progItem.codigo}].`, 'warning');
                    return;
                }
                const bal = this.balances()[item.itemId] || { montoComprometido: 0, cantidadComprometida: 0 };
                const metaFisica = progItem.metaFisica;
                const montoAprobado = progItem.aporteAgroideas;
                if (this.mode === 'create') {
                    if (item.cantidad + bal.cantidadComprometida > (metaFisica + 0.0001)) {
                        this.alertService.toast(`La cantidad excede el saldo físico disponible para [${progItem.codigo}].`, 'warning');
                        return;
                    }
                    if (item.montoAdjudicado + bal.montoComprometido > (montoAprobado + 0.01)) {
                        this.alertService.toast(`El monto excede el saldo financiero disponible para [${progItem.codigo}].`, 'warning');
                        return;
                    }
                }
            }
        }

        this.isSubmitting.set(true);
        if (this.selectedFile()) {
            this.fileStorageService.uploadFile(this.selectedFile()!, 'no-objeciones').subscribe({
                next: (res) => {
                    this.noObjecionForm.patchValue({ archivoUrl: res.fileUrl });
                    this.submitForm();
                },
                error: (err) => {
                    this.isSubmitting.set(false);
                    const msg = err.message || 'Error al subir el archivo de No Objeción.';
                    this.alertService.show('Error', msg, 'error');
                }
            });
        } else {
            this.submitForm();
        }
    }

    private submitForm() {
        const formValue = this.noObjecionForm.getRawValue();
        const request: any = {
            tipoDocumentoId: Number(formValue.tipoDocumento),
            numeroDocumento: formValue.numeroDocumento,
            fechaDocumento: formValue.fechaDocumento,
            archivoUrl: formValue.archivoUrl,
            postulanteId: this.convenioId,
            observacion: formValue.observacion,
            detalles: formValue.items.map((item: any) => ({
                itemMlId: item.itemId,
                cantidad: item.cantidad,
                precioAdjudicado: Number((item.montoAdjudicado / item.cantidad).toFixed(2)),
                montoAdjudicado: item.montoAdjudicado,
                rucProveedor: item.rucProveedor,
                razonSocialProveedor: item.razonSocialProveedor
            }))
        };

        const obs = this.mode === 'edit' && this.noObjecionId
            ? this.noObjecionRepo.update(this.noObjecionId, request)
            : this.noObjecionRepo.create(request);

        obs.subscribe({
            next: () => {
                this.isSubmitting.set(false);
                this.alertService.toast(`No Objeción ${this.mode === 'edit' ? 'actualizada' : 'registrada'} exitosamente.`);
                this.close(true);
            },
            error: (err) => {
                this.isSubmitting.set(false);
                const msg = err.error?.mensaje || 'Error al procesar la No Objeción.';
                this.alertService.show('Error', msg, 'error');
            }
        });
    }
}



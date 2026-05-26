import { UIButtonComponent, UIModalComponent } from '@agroideas/ui';
import { AlertService } from '@agroideas/feedback';
import { Component, input, output, signal, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule, FormArray, FormGroup } from '@angular/forms';
import { CatalogoRepository } from '../../../domain/repositories/catalogo.repository';
import { RegistrarRendicionUseCase } from '../../../domain/usecases/rendicion/registrar-rendicion.usecase';
import { UpdateRendicionUseCase } from '../../../domain/usecases/rendicion/update-rendicion.usecase';
import { GetPendientesRendicionUseCase } from '../../../domain/usecases/rendicion/get-pendientes-rendicion.usecase';
import { UploadFileUseCase } from '../../../domain/usecases/rendicion/upload-file.usecase';
import { Rendicion } from '../../../domain/models/rendicion.model';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-rendicion-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, UIModalComponent, FormsModule, UIButtonComponent],
  templateUrl: './rendicion-modal.component.html'
})
export class RendicionModalComponent implements OnInit {
  visible = input.required<boolean>();
  convenioId = input.required<number>();
  rendicion = input<Rendicion | null>(null);
  onHide = output<void>();
  onSuccess = output<void>();

  private fb = inject(FormBuilder);
  private catalogoRepo = inject(CatalogoRepository);
  private registrarRendicionUseCase = inject(RegistrarRendicionUseCase);
  private updateRendicionUseCase = inject(UpdateRendicionUseCase);
  private getPendientesRendicionUseCase = inject(GetPendientesRendicionUseCase);
  private uploadFileUseCase = inject(UploadFileUseCase);
  private alertService = inject(AlertService);

  isEdit = computed(() => !!this.rendicion());
  modalTitle = computed(() => this.isEdit() ? 'Editar Rendición' : 'Nueva Rendición');

  isSubmitting = signal(false);
  tiposCpe = signal<any[]>([]);
  desembolsosPendientes = signal<any[]>([]);
  selectedDesembolso = signal<any>(null);

  // File Upload State
  selectedFile = signal<File | null>(null);
  uploadingFile = signal(false);
  fileUrl = signal<string | null>(null);

  form = this.fb.group({
    solicitudDesembolsoId: [null as number | null, Validators.required],
    sunatCpeId: [null as number | null, Validators.required],
    serie: ['', [Validators.required, Validators.maxLength(10)]],
    numero: ['', [Validators.required, Validators.maxLength(20)]],
    fechaEmision: ['', Validators.required],
    totalComprobante: [0, [Validators.required, Validators.min(0.01)]],
    observacion: ['', Validators.maxLength(500)],
    detalles: this.fb.array([])
  });

  get detallesFormArray(): FormArray {
    return this.form.get('detalles') as FormArray;
  }

  get totalDistribuido(): number {
    return this.detallesFormArray.controls
      .filter(c => c.get('selected')?.value === true)
      .reduce((sum, c) => sum + (Number(c.get('montoRendido')?.value) || 0), 0);
  }

  get isDistribucionCuadrada(): boolean {
    const total = this.form.get('totalComprobante')?.value || 0;
    return Math.abs(this.totalDistribuido - total) < 0.01;
  }

  constructor() {}

  ngOnInit(): void {
    this.loadCatalogs();
    this.loadDesembolsos();

    // Escuchar cambios en la solicitud seleccionada para poblar los detalles
    this.form.get('solicitudDesembolsoId')?.valueChanges.subscribe(solId => {
      this.onSolicitudChange(solId);
    });

    // Si viene una rendición para editar, precargamos el formulario
    if (this.rendicion()) {
        this.loadRendicionData(this.rendicion()!);
    }
  }

  onSolicitudChange(solId: number | null): void {
    if (solId) {
        const match = this.desembolsosPendientes().find(d => d.id === solId);
        this.selectedDesembolso.set(match);
        
        // Limpiar y poblar FormArray
        const arr = this.detallesFormArray;
        arr.clear();
        
        if (match && match.detalles) {
            match.detalles.forEach((det: any) => {
                arr.push(this.fb.group({
                    selected: [false],
                    solicitudDesembolsoDetId: [det.solicitudDesembolsoDetId],
                    itemNombre: [det.itemNombre],
                    montoDesembolsado: [det.montoDesembolsado],
                    saldoPendiente: [det.saldoPendiente],
                    montoRendido: [0, [Validators.min(0), Validators.max(det.saldoPendiente)]]
                }));
            });
        }
    } else {
        this.selectedDesembolso.set(null);
        this.detallesFormArray.clear();
    }
  }

  loadRendicionData(data: Rendicion): void {
    this.form.patchValue({
      solicitudDesembolsoId: data.solicitudDesembolsoId,
      sunatCpeId: data.sunatCpeId,
      serie: data.serie,
      numero: data.numero,
      fechaEmision: data.fechaEmision instanceof Date
        ? data.fechaEmision.toISOString().split('T')[0]
        : data.fechaEmision.split('T')[0],
      totalComprobante: data.total,
      observacion: data.observacion
    });
  }

  loadCatalogs(): void {
    this.catalogoRepo.getByGrupo('SUNAT_CPE').subscribe(data => this.tiposCpe.set(data));
  }

  loadDesembolsos(): void {
    if (this.convenioId()) {
      this.getPendientesRendicionUseCase.execute(this.convenioId()).subscribe(data => {
        this.desembolsosPendientes.set(data);
      });
    }
  }

  onItemSelectionChange(index: number): void {
    const control = this.detallesFormArray.at(index);
    const isSelected = control.get('selected')?.value;
    const montoControl = control.get('montoRendido');
    
    if (isSelected) {
      // Auto-completar con el saldo restante de la factura o el saldo pendiente del item (el menor de ambos)
      const totalFactura = this.form.get('totalComprobante')?.value || 0;
      const yaDistribuido = this.detallesFormArray.controls
        .filter((c, idx) => idx !== index && c.get('selected')?.value === true)
        .reduce((sum, c) => sum + (Number(c.get('montoRendido')?.value) || 0), 0);
        
      const restanteFactura = Math.max(0, totalFactura - yaDistribuido);
      const saldoItem = control.get('saldoPendiente')?.value || 0;
      
      const autoImputar = Math.min(restanteFactura, saldoItem);
      montoControl?.setValue(autoImputar);
      montoControl?.setValidators([Validators.required, Validators.min(0.01), Validators.max(saldoItem)]);
    } else {
      montoControl?.setValue(0);
      montoControl?.clearValidators();
    }
    montoControl?.updateValueAndValidity();
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        this.alertService.show('Formato no válido', 'Solo se permiten archivos PDF.', 'warning');
        return;
      }
      this.selectedFile.set(file);
      this.uploadFile(file);
    }
  }

  uploadFile(file: File): void {
    this.uploadingFile.set(true);
    this.uploadFileUseCase.execute(file).pipe(
      finalize(() => this.uploadingFile.set(false))
    ).subscribe({
      next: (res) => {
        this.fileUrl.set(res.fileUrl);
        this.alertService.toast('Archivo subido correctamente');
      },
      error: () => this.alertService.show('Error', 'No se pudo subir el archivo comprobante.', 'error')
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // Obtener detalles seleccionados
    const selectedDetalles = this.detallesFormArray.controls
      .filter(c => c.get('selected')?.value === true)
      .map(c => ({
        solicitudDesembolsoDetId: c.get('solicitudDesembolsoDetId')?.value,
        montoRendido: Number(c.get('montoRendido')?.value)
      }));

    if (selectedDetalles.length === 0) {
      this.alertService.show('Distribución requerida', 'Debe seleccionar y asignar montos a al menos un ítem del desembolso.', 'warning');
      return;
    }

    if (!this.isDistribucionCuadrada) {
      this.alertService.show(
        'Distribución incompleta o incorrecta', 
        `La suma de las imputaciones (S/ ${this.totalDistribuido.toFixed(2)}) debe coincidir exactamente con el total del comprobante (S/ ${(this.form.get('totalComprobante')?.value || 0).toFixed(2)}).`, 
        'warning'
      );
      return;
    }

    // Solo validamos archivo en modo creación
    if (!this.isEdit() && !this.fileUrl()) {
        this.alertService.show('Archivo requerido', 'Debe subir el comprobante en PDF.', 'warning');
        return;
    }

    this.isSubmitting.set(true);
    const request = {
      solicitudDesembolsoId: this.form.value.solicitudDesembolsoId,
      sunatCpeId: this.form.value.sunatCpeId,
      serie: this.form.value.serie,
      numero: this.form.value.numero,
      fechaEmision: this.form.value.fechaEmision,
      totalComprobante: this.form.value.totalComprobante,
      observacion: this.form.value.observacion,
      detalles: selectedDetalles,
      archivos: this.fileUrl() ? [{ tipoArchivoId: 1, urlArchivo: this.fileUrl()! }] : []
    };

    const obs$ = this.isEdit()
        ? this.updateRendicionUseCase.execute(this.rendicion()!.id, request as any)
        : this.registrarRendicionUseCase.execute(request as any);

    obs$.pipe(
      finalize(() => this.isSubmitting.set(false))
    ).subscribe({
      next: () => {
        this.alertService.toast(this.isEdit() ? 'Rendición actualizada exitosamente' : 'Rendición registrada exitosamente');
        this.onSuccess.emit();
        this.reset();
      },
      error: (err) => this.alertService.show('Error', err.error?.mensaje || 'Error al procesar la rendición.', 'error')
    });
  }

  reset(): void {
    this.form.reset();
    this.selectedFile.set(null);
    this.fileUrl.set(null);
    this.selectedDesembolso.set(null);
    this.detallesFormArray.clear();
  }

  hide(): void {
    this.onHide.emit();
  }
}

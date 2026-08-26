import { AlertService } from '@agroideas/feedback';
import { UIButtonComponent, UIModalComponent, UiFileChipComponent } from '@agroideas/ui';
import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject, input, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { finalize } from 'rxjs/operators';
import { DesembolsoChequePendiente } from '../../../domain/models/desembolso.model';
import { DesembolsoRepository } from '../../../domain/repositories/desembolso.repository';

@Component({
    selector: 'app-activar-cheque-modal',
    standalone: true,
    imports: [CommonModule, DecimalPipe, UIModalComponent, UIButtonComponent, UiFileChipComponent],
    templateUrl: './activar-cheque-modal.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActivarChequeModalComponent {
    cheque = input.required<DesembolsoChequePendiente>();
    @Output() onClose = new EventEmitter<boolean>();

    visible = signal(true);
    selectedFile = signal<File | null>(null);
    uploadingFile = signal(false);
    fileUrl = signal<string | null>(null);
    isSubmitting = signal(false);

    private desembolsoRepo = inject(DesembolsoRepository);
    private alertService = inject(AlertService);

    onFileSelected(event: Event): void {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            this.alertService.show('Formato no válido', 'Solo se permiten archivos PDF.', 'warning');
            return;
        }

        this.selectedFile.set(file);
        this.uploadingFile.set(true);
        this.desembolsoRepo.uploadFile(file).pipe(finalize(() => this.uploadingFile.set(false))).subscribe({
            next: (res) => {
                this.fileUrl.set(res.fileUrl);
                this.alertService.toast('Archivo subido correctamente');
            },
            error: (err) => {
                this.selectedFile.set(null);
                this.alertService.show('Error', err?.error?.mensaje || 'No se pudo subir el archivo sustentatorio.', 'error');
            }
        });
    }

    removeFile(): void {
        this.selectedFile.set(null);
        this.fileUrl.set(null);
    }

    save(): void {
        if (!this.fileUrl()) {
            this.alertService.toast('Debe adjuntar la documentación sustentatoria (contrapartida).');
            return;
        }

        this.isSubmitting.set(true);
        this.desembolsoRepo.activarCheque(this.cheque().id, this.fileUrl()!)
            .pipe(finalize(() => this.isSubmitting.set(false)))
            .subscribe({
                next: () => {
                    this.alertService.show('Éxito', 'El cheque ha sido activado (GIRADO) y el monto quedó disponible para rendir.', 'success');
                    this.onHide(true);
                },
                error: (err) => {
                    this.alertService.show('Error', err.error?.mensaje || 'No se pudo activar el cheque.', 'error');
                }
            });
    }

    onHide(refresh = false): void {
        this.visible.set(false);
        this.onClose.emit(refresh);
    }
}

import { ChangeDetectionStrategy, Component, EventEmitter, Output, input, viewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UIModalComponent } from '@agroideas/ui';
import { AlertService } from '@agroideas/feedback';

@Component({
  selector: 'app-informe-upload-pdf-modal',
  standalone: true,
  imports: [CommonModule, UIModalComponent],
  template: `
    <!-- Modal Upload PDF Firmado -->
    <app-ui-modal
      [visible]="visible()"
      title="Adjuntar PDF Firmado"
      subtitle="Suba el informe técnico firmado digitalmente"
      icon="upload"
      maxWidth="500px"
      saveLabel="Subir PDF"
      [isSubmitting]="uploading()"
      (onHide)="onHideModal()"
      (onSave)="onSubmit()"
    >
      <div class="space-y-4 font-display">
        <div class="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div class="flex items-start gap-2">
            <span class="material-symbols-outlined text-amber-600 text-sm">warning</span>
            <div class="text-xs text-amber-800">
              <p class="font-bold">Importante</p>
              <p>El PDF debe estar firmado por el asistente técnico antes de ser adjuntado. Una vez subido, no podrá ser modificado.</p>
            </div>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Archivo PDF</label>
          <input
            #fileInput
            type="file"
            accept=".pdf"
            (change)="onFileSelected($event)"
            class="hidden"
          />
          <div
            (click)="triggerFileInput()"
            class="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary hover:bg-slate-50 transition-colors"
          >
            @if (selectedFile) {
              <span class="material-symbols-outlined text-green-600 text-2xl">check_circle</span>
              <p class="text-sm font-medium text-slate-700 mt-2">{{ selectedFile.name }}</p>
              <p class="text-xs text-slate-500 mt-1">{{ (selectedFile.size / 1024 / 1024).toFixed(2) }} MB</p>
              <p class="text-xs text-primary mt-2">Clic para cambiar archivo</p>
            } @else {
              <span class="material-symbols-outlined text-slate-400 text-2xl">upload_file</span>
              <p class="text-sm font-medium text-slate-600 mt-2">Clic para seleccionar archivo PDF</p>
              <p class="text-xs text-slate-400 mt-1">Máximo 10MB</p>
            }
          </div>
        </div>
      </div>
    </app-ui-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InformeUploadPdfModalComponent {
  private alertService = inject(AlertService);
  private fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  visible = input.required<boolean>();
  uploading = input.required<boolean>();

  @Output() hide = new EventEmitter<void>();
  @Output() save = new EventEmitter<File>();

  selectedFile: File | null = null;

  onFileSelected(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    if (inputElement.files && inputElement.files.length > 0) {
      const file = inputElement.files[0];
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        this.alertService.toast('Solo se permiten archivos PDF', 'warning');
        inputElement.value = '';
        this.selectedFile = null;
        return;
      }
      this.selectedFile = file;
    }
  }

  triggerFileInput() {
    this.fileInput()?.nativeElement.click();
  }

  onSubmit() {
    if (!this.selectedFile) {
      this.alertService.toast('Seleccione un archivo PDF', 'warning');
      return;
    }
    this.save.emit(this.selectedFile);
    this.reset();
  }

  onHideModal() {
    this.hide.emit();
    this.reset();
  }

  reset() {
    this.selectedFile = null;
    const inputElement = this.fileInput();
    if (inputElement) {
      inputElement.nativeElement.value = '';
    }
  }
}

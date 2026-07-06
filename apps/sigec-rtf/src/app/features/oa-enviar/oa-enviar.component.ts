import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RtfService } from '../../core/services/rtf.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-oa-enviar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <!-- Header -->
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-foreground">Enviar Paso Crítico 2</h1>
        <p class="text-sm text-muted-foreground">
          Remisión formal del informe de ejecución física y financiera (Anexo N° 17).
        </p>
      </div>

      <!-- State Warning banner -->
      <div *ngIf="rtfService.rtfStatus() === 'Enviado' || rtfService.rtfStatus() === 'En Auditoría Regional' || rtfService.rtfStatus() === 'Validado Oficialmente'" 
           class="bg-success-soft border border-success/20 p-4 rounded-xl flex gap-3 text-success">
        <span class="material-symbols-outlined text-[24px]">task_alt</span>
        <div>
          <h4 class="font-bold text-sm">Reporte Enviado</h4>
          <p class="text-xs text-success/80 mt-1">
            Este Paso Crítico ya ha sido remitido para auditoría regional y se encuentra bloqueado para modificaciones. 
            Estado actual: <span class="font-bold underline">{{ rtfService.rtfStatus() }}</span>.
          </p>
        </div>
      </div>

      <!-- Requirements checklist -->
      <div class="bg-surface-container-lowest border border-border rounded-xl p-6 space-y-4">
        <h3 class="text-sm font-bold text-foreground flex items-center gap-2">
          <span class="material-symbols-outlined text-primary text-[18px]">verified</span>
          Requisitos previos para el envío
        </h3>
        <div class="space-y-3">
          <div class="flex items-center gap-3 text-xs border-b border-border pb-3">
            <span class="material-symbols-outlined text-success">check_circle</span>
            <div class="flex-1">
              <span class="font-medium text-foreground block">Registro de Metas Físicas</span>
              <span class="text-muted-foreground text-[11px]">4 actividades físicas de Anexo N° 17 completadas.</span>
            </div>
          </div>
          <div class="flex items-center gap-3 text-xs border-b border-border pb-3">
            <span class="material-symbols-outlined text-success">check_circle</span>
            <div class="flex-1">
              <span class="font-medium text-foreground block">Mapeo de Indicadores y Resultados</span>
              <span class="text-muted-foreground text-[11px]">Datos de productividad actualizados.</span>
            </div>
          </div>
          <div class="flex items-center gap-3 text-xs pb-1">
            <span class="material-symbols-outlined text-success">check_circle</span>
            <div class="flex-1">
              <span class="font-medium text-foreground block">Soportes y Evidencias Digitales</span>
              <span class="text-muted-foreground text-[11px]">Facturas de KOFIX y comprobantes de almacén cargados en PDF.</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Upload Signed PDF -->
      <div *ngIf="rtfService.rtfStatus() === 'En Edición' || rtfService.rtfStatus() === 'Observado en Región'" 
           class="bg-surface-container-lowest border border-border rounded-xl p-6 space-y-4">
        <h3 class="text-sm font-bold text-foreground flex items-center gap-2">
          <span class="material-symbols-outlined text-primary text-[18px]">cloud_upload</span>
          Cargar Reporte Firmado (Anexo N° 17)
        </h3>
        <p class="text-xs text-muted-foreground">
          Descargue el reporte consolidado generado, fírmelo por el Representante Legal de la OA, y súbalo en formato PDF.
        </p>

        <!-- Dropzone representation -->
        <div class="border-2 border-dashed border-border rounded-xl p-8 text-center bg-surface-container/10 hover:bg-surface-container/20 hover:border-primary/50 transition-all cursor-pointer">
          <input type="file" id="signed-pdf" class="hidden" (change)="onFileSelected($event)" accept=".pdf">
          <label for="signed-pdf" class="cursor-pointer space-y-2 block">
            <span class="material-symbols-outlined text-[36px] text-muted-foreground block">picture_as_pdf</span>
            <span class="text-xs font-semibold text-primary block">Haga clic para seleccionar o arrastre el archivo PDF aquí</span>
            <span class="text-[10px] text-muted-foreground block">Máximo 10 MB (Solo formato PDF)</span>
          </label>
        </div>

        <!-- File selected confirmation -->
        <div *ngIf="fileName" class="flex items-center justify-between bg-surface-container/30 border border-border p-3 rounded-lg text-xs">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-danger text-[18px]">picture_as_pdf</span>
            <span class="font-medium text-foreground">{{ fileName }}</span>
          </div>
          <button (click)="removeFile()" class="text-muted-foreground hover:text-danger flex items-center">
            <span class="material-symbols-outlined text-[16px]">delete</span>
          </button>
        </div>
      </div>

      <!-- Submit Action Controls -->
      <div *ngIf="rtfService.rtfStatus() === 'En Edición' || rtfService.rtfStatus() === 'Observado en Región'" 
           class="flex items-center justify-end gap-3 pt-4">
        <button 
          (click)="onCancel()"
          class="px-4 py-2 border border-border rounded-lg text-xs font-semibold hover:bg-surface-container transition-colors"
        >
          Cancelar
        </button>
        <button 
          (click)="onSubmit()"
          [disabled]="!fileName"
          class="px-5 py-2 bg-primary text-primary-foreground disabled:opacity-50 rounded-lg text-xs font-semibold hover:bg-primary/95 shadow transition-all flex items-center gap-1.5"
        >
          <span class="material-symbols-outlined text-[16px]">send</span>
          Enviar Reporte Oficial
        </button>
      </div>
    </div>
  `
})
export class OaEnviarComponent {
  rtfService = inject(RtfService);
  router = inject(Router);

  fileName: string | null = null;

  onFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      this.fileName = file.name;
    }
  }

  removeFile() {
    this.fileName = null;
  }

  onCancel() {
    this.router.navigate(['/rtf/dashboard']);
  }

  onSubmit() {
    if (this.fileName) {
      // Transition state to Sent
      this.rtfService.rtfStatus.set('Enviado');
      this.router.navigate(['/rtf/dashboard']);
    }
  }
}

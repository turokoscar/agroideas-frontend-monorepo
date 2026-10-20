import { Component, inject, input, model } from '@angular/core';
import { ToastService, UiFileChipComponent } from '@agroideas/ui';
import { environment } from '../../environments/environment';

/**
 * Selector de un PDF con el patrón de kofix (`form-file-upload` + `ui-file-chip`). Valida tipo y tamaño
 * (`AppSettings.archivos.tamanoMaximoPdfMb`) antes de aceptarlo; la API vuelve a validarlo al recibirlo.
 * Uso: `<app-selector-pdf etiqueta="RDE suscrita" [(archivo)]="rde" />`.
 */
@Component({
  selector: 'app-selector-pdf',
  standalone: true,
  imports: [UiFileChipComponent],
  template: `
    <div class="form-field">
      <span class="form-label">{{ etiqueta() }} @if (requerido()) { <span class="form-label-required">*</span> }</span>
      <input #entrada type="file" accept="application/pdf" hidden (change)="seleccionar($event)" />
      @if (archivo(); as f) {
        <ui-file-chip [name]="f.name" [size]="f.size" [disabled]="deshabilitado()" (onRemove)="archivo.set(null)" />
      } @else {
        <div class="form-file-upload group min-h-[80px] flex-col items-center justify-center p-4 text-center"
          [class.pointer-events-none]="deshabilitado()" [class.opacity-50]="deshabilitado()"
          role="button" [attr.tabindex]="deshabilitado() ? -1 : 0" [attr.aria-label]="'Adjuntar ' + etiqueta() + ' en PDF'"
          (click)="entrada.click()" (keydown.enter)="entrada.click()" (keydown.space)="$event.preventDefault(); entrada.click()">
          <span class="material-symbols-outlined mb-1 text-2xl text-slate-400 transition-transform group-hover:scale-105">upload_file</span>
          <p class="text-[10px] font-semibold leading-normal text-slate-500">
            {{ ayuda() || 'PDF' }} (máx. {{ tamanoMaximoMb }} MB). Haz clic para seleccionarlo.
          </p>
        </div>
      }
    </div>
  `
})
export class SelectorPdfComponent {
  private toast = inject(ToastService);

  etiqueta = input.required<string>();
  ayuda = input('');
  requerido = input(true);
  deshabilitado = input(false);
  archivo = model<File | null>(null);

  readonly tamanoMaximoMb = environment.archivos.tamanoMaximoPdfMb;

  seleccionar(event: Event) {
    const entrada = event.target as HTMLInputElement;
    const archivo = entrada.files?.[0];
    entrada.value = '';
    if (!archivo) return;
    if (archivo.type !== 'application/pdf') {
      this.toast.error('Formato no permitido', `Adjunte ${this.etiqueta().toLowerCase()} en PDF.`);
      return;
    }
    if (archivo.size > this.tamanoMaximoMb * 1024 * 1024) {
      this.toast.error('Archivo muy grande', `El PDF no debe superar los ${this.tamanoMaximoMb} MB.`);
      return;
    }
    this.archivo.set(archivo);
  }
}

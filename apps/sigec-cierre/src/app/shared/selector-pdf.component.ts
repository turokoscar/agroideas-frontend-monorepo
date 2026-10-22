import { Component, inject, input, model } from '@angular/core';
import { FileInfo, FileRejection, ToastService, UiDropzoneComponent, UiFileChipComponent } from '@agroideas/ui';
import { environment } from '../../environments/environment';

/**
 * Selector de un PDF sobre `ui-dropzone` (arrastrar y soltar o elegir, con teclado) y `ui-file-chip`, los mismos de
 * sigec-rtf (ADR 0014, Fase 2). El tamaño máximo sale de `AppSettings.archivos.tamanoMaximoPdfMb`; un archivo
 * rechazado se avisa con un toast. La API vuelve a validarlo al recibirlo.
 * Uso: `<app-selector-pdf etiqueta="RDE suscrita" [(archivo)]="rde" />`.
 */
@Component({
  selector: 'app-selector-pdf',
  standalone: true,
  host: { class: 'block' },
  imports: [UiDropzoneComponent, UiFileChipComponent],
  template: `
    <div class="form-field">
      <span class="form-label">{{ etiqueta() }} @if (requerido()) { <span class="form-label-required">*</span> }</span>
      @if (archivo(); as f) {
        <ui-file-chip [name]="f.name" [size]="f.size" [disabled]="deshabilitado()" (onRemove)="archivo.set(null)" />
      } @else {
        <ui-dropzone
          [compact]="true"
          [multiple]="false"
          [maxMB]="tamanoMaximoMb"
          [disabled]="deshabilitado()"
          label="Arrastre el PDF aquí o haga clic para elegirlo"
          [hint]="(ayuda() || 'PDF') + ' (máx. ' + tamanoMaximoMb + ' MB)'"
          [ariaLabel]="'Adjuntar ' + etiqueta() + ' en PDF'"
          (onFile)="aceptar($event)"
          (onReject)="rechazar($event)"
        />
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

  aceptar(archivo: FileInfo) {
    this.archivo.set(archivo.file);
  }

  rechazar(rechazo: FileRejection) {
    if (rechazo.reason === 'type') {
      this.toast.error('Formato no permitido', `Adjunte ${this.etiqueta().toLowerCase()} en PDF.`);
    } else {
      this.toast.error('Archivo muy grande', `El PDF no debe superar los ${this.tamanoMaximoMb} MB.`);
    }
  }
}

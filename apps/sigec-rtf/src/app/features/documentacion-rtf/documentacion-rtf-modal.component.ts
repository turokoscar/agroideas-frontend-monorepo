import { Component, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Observable } from 'rxjs';
import { UIButtonComponent, UiPdfViewerComponent, ToastService } from '@agroideas/ui';
import { RtfService } from '../../core/services/rtf.service';
import { DocumentoRepositorioDto } from '../../core/models';
import { etiquetaTipoDocumento } from '../../core/models/tipo-documento-anexo.model';

/**
 * Repositorio consolidado de documentos de un RTF (Anexo 17, evidencias, informes, Anexo 18) —
 * modal reutilizable desde cualquier pantalla que liste RTFs (bandeja-oa, un-gabinete). Se abre
 * imperativamente con `abrir(rtfId)`, así el padre no necesita administrar su estado.
 */
@Component({
  selector: 'app-documentacion-rtf-modal',
  standalone: true,
  imports: [CommonModule, DatePipe, UIButtonComponent, UiPdfViewerComponent],
  templateUrl: './documentacion-rtf-modal.component.html',
})
export class DocumentacionRtfModalComponent {
  private rtfService = inject(RtfService);
  private toast = inject(ToastService);

  open = signal(false);
  rtfId = signal<number | null>(null);
  cargando = signal(false);
  descargandoZip = signal(false);
  documentos = signal<DocumentoRepositorioDto[]>([]);

  pdfViewerOpen = signal(false);
  pdfViewerFilename = signal<string | null>(null);
  pdfViewerFileUrl = signal<string | null>(null);
  pdfViewerDownloadUrl = signal<string | null>(null);

  abrir(rtfId: number) {
    this.rtfId.set(rtfId);
    this.open.set(true);
    this.cargando.set(true);
    this.documentos.set([]);

    this.rtfService.listarDocumentos(rtfId).subscribe({
      next: (docs: DocumentoRepositorioDto[]) => {
        this.documentos.set(docs);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.toast.error('Error', 'No se pudo cargar la documentación del RTF.');
      }
    });
  }

  cerrar() {
    this.open.set(false);
    this.documentos.set([]);
  }

  etiquetaCategoria(doc: DocumentoRepositorioDto): string {
    if (doc.categoria === 'ANEXO_17') return 'Anexo 17 (documento oficial)';
    if (doc.categoria === 'ANEXO_18') return 'Anexo 18 (documento oficial)';
    switch (doc.tipConcepto) {
      case 'ACTA_CAMPO': return 'Acta de Campo (Anexo 19)';
      case 'ANEXO17_FIRMADO': return 'Anexo 17 firmado (copia escaneada)';
      case 'ANEXO18_FIRMADO': return 'Anexo 18 firmado (copia escaneada)';
      default: return etiquetaTipoDocumento(doc.tipConcepto);
    }
  }

  private blobParaDocumento(doc: DocumentoRepositorioDto): Observable<Blob> {
    const rtfId = this.rtfId()!;
    if (doc.categoria === 'ANEXO_17') return this.rtfService.descargarAnexo17(rtfId);
    if (doc.categoria === 'ANEXO_18') return this.rtfService.descargarAnexo18(rtfId);
    return this.rtfService.downloadEvidencia(doc.ideEvidencia!);
  }

  verDocumento(doc: DocumentoRepositorioDto) {
    this.pdfViewerFilename.set(doc.txtNombreArchivo);
    this.pdfViewerFileUrl.set(null);
    this.pdfViewerDownloadUrl.set(null);
    this.pdfViewerOpen.set(true);

    this.blobParaDocumento(doc).subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        this.pdfViewerFileUrl.set(url);
        this.pdfViewerDownloadUrl.set(url);
      },
      error: () => {
        this.toast.error('Error', 'No se pudo cargar el documento.');
        this.pdfViewerOpen.set(false);
      }
    });
  }

  cerrarPreview() {
    const url = this.pdfViewerFileUrl();
    if (url) URL.revokeObjectURL(url);
    this.pdfViewerOpen.set(false);
    this.pdfViewerFileUrl.set(null);
    this.pdfViewerDownloadUrl.set(null);
  }

  descargarDocumento(doc: DocumentoRepositorioDto) {
    this.blobParaDocumento(doc).subscribe({
      next: (blob: Blob) => this.descargarBlob(blob, doc.txtNombreArchivo),
      error: () => this.toast.error('Error', 'No se pudo descargar el documento.')
    });
  }

  descargarZip() {
    const rtfId = this.rtfId();
    if (!rtfId) return;

    this.descargandoZip.set(true);
    this.rtfService.descargarDocumentacionZip(rtfId).subscribe({
      next: (blob: Blob) => {
        this.descargandoZip.set(false);
        this.descargarBlob(blob, `Documentacion_RTF_${rtfId}.zip`);
      },
      error: () => {
        this.descargandoZip.set(false);
        this.toast.error('Error', 'No se pudo descargar la documentación.');
      }
    });
  }

  private descargarBlob(blob: Blob, nombreArchivo: string) {
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombreArchivo;
    enlace.click();
    URL.revokeObjectURL(url);
  }
}

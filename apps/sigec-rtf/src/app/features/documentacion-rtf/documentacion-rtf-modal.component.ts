import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Observable } from 'rxjs';
import { UIButtonComponent, UiPdfViewerComponent, ToastService } from '@agroideas/ui';
import { RtfService } from '../../core/services/rtf.service';
import { DocumentoRepositorioDto } from '../../core/models';
import { esDocumentoAnexo, etiquetaTipoDocumento } from '../../core/models/tipo-documento-anexo.model';

/**
 * Repositorio consolidado de documentos de un RTF — modal reutilizable desde cualquier pantalla
 * que liste RTFs (bandeja-oa, un-gabinete). Se abre imperativamente con `abrir(rtfId)`, así el
 * padre no necesita administrar su estado.
 *
 * Solo se listan Anexos (firmados) e Informes -- las evidencias de meta física/indicador se
 * excluyen a propósito: el repositorio no trae el vínculo evidencia→meta/indicador
 * (`EvidenceDto.ideConcepto`), así que no hay forma de mostrar el nombre de la actividad sin
 * llamadas adicionales contra las señales compartidas de metas/indicadores (riesgo de pisar el
 * estado de otra pantalla, ver `OaDashboardComponent.irAObservaciones`). De los Anexos 17/18 solo
 * se muestra la copia firmada (`ANEXO17_FIRMADO`/`ANEXO18_FIRMADO`) -- la versión oficial sin
 * firmar (`categoria: 'ANEXO_17'|'ANEXO_18'`) es un documento de trabajo, no el definitivo.
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

  /** Anexos primero, Informes después; dentro de cada grupo, por fecha de registro ascendente. */
  documentosOrdenados = computed(() => {
    return this.documentos()
      .filter(doc => this.esAnexo(doc) || esDocumentoAnexo(doc.tipConcepto))
      .sort((a, b) => {
        const grupo = this.grupoOrden(a) - this.grupoOrden(b);
        return grupo !== 0 ? grupo : (a.fecRegistro ?? '').localeCompare(b.fecRegistro ?? '');
      });
  });

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

  /**
   * Angular 18: usar `??`/`?.` directamente en la expresión `track` de un `@for` genera un
   * temporal (`tmp_N_0`) que queda fuera de scope en `_forTrackN` y revienta con
   * "ReferenceError: tmp_N_0 is not defined" en runtime (no en build). Se mueve el `??` a un
   * método para que el compilador no tenga que sintetizarlo dentro del track.
   */
  trackDocumento(doc: DocumentoRepositorioDto): string | number {
    return doc.ideEvidencia ?? doc.categoria;
  }

  /** Solo cubre lo que `documentosOrdenados()` deja pasar: anexo firmado o informe/sustento. */
  private esAnexo(doc: DocumentoRepositorioDto): boolean {
    return doc.tipConcepto === 'ANEXO17_FIRMADO' || doc.tipConcepto === 'ANEXO18_FIRMADO' || doc.tipConcepto === 'ACTA_CAMPO';
  }

  private grupoOrden(doc: DocumentoRepositorioDto): number {
    return this.esAnexo(doc) ? 0 : 1;
  }

  categoriaLabel(doc: DocumentoRepositorioDto): string {
    return this.esAnexo(doc) ? 'Anexos' : 'Informes';
  }

  nombreDocumento(doc: DocumentoRepositorioDto): string {
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

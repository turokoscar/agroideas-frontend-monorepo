import { Component, ElementRef, Injector, afterNextRender, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';

/**
 * El worker se configura al abrir el primer PDF y no al cargar el módulo: un
 * efecto secundario a nivel de módulo impide descartar pdf.js del bundle de las
 * apps que no usan el visor. El archivo lo publica cada app desde
 * `node_modules/pdfjs-dist/build` (assets en project.json), así que siempre
 * coincide con la versión instalada.
 */
function ensurePdfWorker(): void {
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  }
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;

@Component({
  selector: 'ui-pdf-viewer',
  standalone: true,
  imports: [CommonModule],
  styleUrl: './ui-pdf-viewer.component.css',
  template: `
    @if (open()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        (click)="onOverlayClick()"
      >
        <div
          class="mx-4 flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-border bg-background shadow-2xl"
          (click)="$event.stopPropagation()"
        >
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-border px-6 py-4">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-[20px] text-primary">description</span>
              <h2 class="text-base font-semibold text-foreground">{{ filename() ?? 'Documento' }}</h2>
            </div>
            <button
              class="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              (click)="close()"
              type="button"
            >
              <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <!-- Toolbar -->
          <div class="flex items-center justify-between gap-2 bg-muted/50 px-6 py-2 text-xs">
            <div class="flex items-center gap-1">
              <button
                class="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                type="button"
                [disabled]="!pdfReady() || currentPage() <= 1"
                (click)="prevPage()"
              >
                <span class="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <span class="min-w-[90px] text-center text-muted-foreground">
                @if (pdfReady()) {
                  Página {{ currentPage() }} de {{ totalPages() }}
                }
              </span>
              <button
                class="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                type="button"
                [disabled]="!pdfReady() || currentPage() >= totalPages()"
                (click)="nextPage()"
              >
                <span class="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>

            <div class="flex items-center gap-1">
              <button
                class="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                type="button"
                [disabled]="!pdfReady() || scale() <= 0.5"
                (click)="zoomOut()"
              >
                <span class="material-symbols-outlined text-[18px]">zoom_out</span>
              </button>
              <span class="min-w-[42px] text-center text-muted-foreground">{{ (scale() * 100) | number:'1.0-0' }}%</span>
              <button
                class="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                type="button"
                [disabled]="!pdfReady() || scale() >= 3"
                (click)="zoomIn()"
              >
                <span class="material-symbols-outlined text-[18px]">zoom_in</span>
              </button>

              @if (downloadUrl()) {
                <a
                  [href]="downloadUrl()"
                  download
                  class="ml-1 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <span class="material-symbols-outlined text-[16px]">download</span>
                  Descargar
                </a>
              }
            </div>
          </div>

          <!-- PDF Content -->
          <div class="flex-1 overflow-auto bg-muted/20 p-6">
            @if (loading()) {
              <div class="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <span class="material-symbols-outlined text-[36px] text-primary animate-spin">progress_activity</span>
                <p class="text-sm text-muted-foreground">Cargando documento...</p>
              </div>
            } @else if (error()) {
              <div class="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-destructive/40 bg-destructive/5 p-12 text-center">
                <span class="material-symbols-outlined text-[48px] text-destructive/60">error</span>
                <p class="text-sm font-medium text-destructive">{{ error() }}</p>
              </div>
            } @else if (!fileUrl()) {
              <div class="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-muted/20 p-12 text-center">
                <span class="material-symbols-outlined text-[48px] text-muted-foreground/50">picture_as_pdf</span>
                <p class="text-sm font-medium text-foreground">{{ filename() ?? 'Documento sin nombre' }}</p>
              </div>
            }
            <div class="flex justify-center" [class.hidden]="loading() || error() || !fileUrl()">
              <canvas #pdfCanvas class="rounded-lg border border-border bg-white shadow-sm"></canvas>
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class UiPdfViewerComponent {
  open = input<boolean>(false);
  filename = input<string | null>(null);
  fileUrl = input<string | null>(null);
  downloadUrl = input<string | null>(null);

  onOpenChange = output<boolean>();

  private canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('pdfCanvas');

  loading = signal(false);
  error = signal<string | null>(null);
  currentPage = signal(1);
  totalPages = signal(0);
  scale = signal(1.2);
  pdfReady = signal(false);

  private pdfDoc: PDFDocumentProxy | null = null;
  private renderTask: RenderTask | null = null;
  private loadedUrl: string | null = null;
  private injector = inject(Injector);

  constructor() {
    // allowSignalWrites: cleanupDoc() escribe señales (totalPages, pdfReady, etc.) — sin esto
    // Angular lanza NG0600 y desactiva el effect de forma permanente tras el primer error.
    effect(() => {
      const isOpen = this.open();
      const url = this.fileUrl();

      if (isOpen && url && url !== this.loadedUrl) {
        this.loadedUrl = url;
        afterNextRender(() => this.loadPdf(url), { injector: this.injector });
      } else if (!isOpen) {
        this.loadedUrl = null;
        this.cleanupDoc();
      }
    }, { allowSignalWrites: true });
  }

  private async loadPdf(url: string) {
    this.loading.set(true);
    this.error.set(null);
    this.pdfReady.set(false);
    this.cleanupDoc();

    try {
      ensurePdfWorker();
      const loadingTask = pdfjsLib.getDocument({
        url,
        cMapUrl: '/cmaps/',
        cMapPacked: true,
        standardFontDataUrl: '/standard_fonts/'
      });
      this.pdfDoc = await loadingTask.promise;
      this.totalPages.set(this.pdfDoc.numPages);
      this.currentPage.set(1);
      this.pdfReady.set(true);
      await this.renderPage(1);
    } catch (e) {
      console.error('Error cargando el PDF', e);
      this.error.set('No se pudo cargar el documento PDF.');
    } finally {
      this.loading.set(false);
    }
  }

  private async renderPage(pageNum: number) {
    if (!this.pdfDoc) return;
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;

    const page = await this.pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: this.scale() });
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    this.renderTask?.cancel();
    this.renderTask = page.render({ canvasContext: ctx, viewport });
    try {
      await this.renderTask.promise;
    } catch {
      // Una renderización cancelada (cambio rápido de página/zoom) no es un error real.
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
      this.renderPage(this.currentPage());
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.renderPage(this.currentPage());
    }
  }

  zoomIn() {
    this.scale.update(s => Math.min(MAX_SCALE, Math.round((s + 0.2) * 10) / 10));
    this.renderPage(this.currentPage());
  }

  zoomOut() {
    this.scale.update(s => Math.max(MIN_SCALE, Math.round((s - 0.2) * 10) / 10));
    this.renderPage(this.currentPage());
  }

  close(): void {
    this.onOpenChange.emit(false);
  }

  onOverlayClick(): void {
    this.close();
  }

  private cleanupDoc() {
    this.renderTask?.cancel();
    this.renderTask = null;
    this.pdfDoc?.destroy();
    this.pdfDoc = null;
    this.totalPages.set(0);
    this.currentPage.set(1);
    this.scale.set(1.2);
    this.pdfReady.set(false);
  }
}

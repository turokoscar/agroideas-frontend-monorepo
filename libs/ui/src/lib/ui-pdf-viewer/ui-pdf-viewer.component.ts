import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

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
            <span class="text-muted-foreground">Visor de documento</span>
            <div class="flex gap-1">
              @if (downloadUrl()) {
                <a
                  [href]="downloadUrl()"
                  download
                  class="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <span class="material-symbols-outlined text-[16px]">download</span>
                  Descargar
                </a>
              }
            </div>
          </div>

          <!-- PDF Content -->
          <div class="flex-1 overflow-auto p-6">
            @if (fileUrl()) {
              <iframe
                [src]="fileUrl()"
                class="h-[60vh] w-full rounded-lg border border-border"
                style="border: none;"
              ></iframe>
            } @else {
              <div class="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-muted/20 p-12 text-center">
                <span class="material-symbols-outlined text-[48px] text-muted-foreground/50">picture_as_pdf</span>
                <div>
                  <p class="text-sm font-medium text-foreground">{{ filename() ?? 'Documento sin nombre' }}</p>
                  <p class="mt-1 text-xs text-muted-foreground">
                    Visor de documento. En producción aquí se renderizaría el contenido del PDF.
                  </p>
                </div>
              </div>
            }
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

  close(): void {
    this.onOpenChange.emit(false);
  }

  onOverlayClick(): void {
    this.close();
  }
}

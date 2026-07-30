import { Component, input, output, signal, HostListener, ElementRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface FileInfo {
  name: string;
  size: number;
}

@Component({
  selector: 'ui-dropzone',
  standalone: true,
  imports: [CommonModule],
  styleUrl: './ui-dropzone.component.css',
  template: `
    <div
      #dropzone
      class="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition-all"
      [ngClass]="dropzoneClasses()"
      (click)="onClick()"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave()"
      (drop)="onDrop($event)"
    >
      <span class="material-symbols-outlined text-[32px] text-primary">cloud_upload</span>
      <div class="text-sm font-medium">{{ label() }}</div>
      <div class="text-xs text-muted-foreground">PDF, máx {{ maxMB() }}MB</div>
      <input
        #fileInput
        type="file"
        [accept]="accept()"
        [multiple]="multiple()"
        class="hidden"
        (change)="handleFiles($event)"
      />
    </div>
  `
})
export class UiDropzoneComponent {
  accept = input<string>('application/pdf');
  maxMB = input<number>(10);
  label = input<string>('Arrastre y suelte sus PDFs aquí');
  multiple = input<boolean>(true);
  disabled = input<boolean>(false);

  onFile = output<FileInfo>();

  dragging = signal(false);

  private fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  dropzoneClasses = () => {
    if (this.disabled()) return 'border-border bg-muted/30 opacity-60 cursor-not-allowed';
    if (this.dragging()) return 'border-primary bg-primary/5';
    return 'border-border bg-muted/20 hover:border-primary/50 hover:bg-primary/5';
  };

  @HostListener('dragenter', ['$event'])
  onDragEnter(e: DragEvent): void {
    e.preventDefault();
    if (!this.disabled()) this.dragging.set(true);
  }

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    if (!this.disabled()) this.dragging.set(true);
  }

  onDragLeave(): void {
    this.dragging.set(false);
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragging.set(false);
    if (!this.disabled() && e.dataTransfer?.files) {
      this.processFiles(e.dataTransfer.files);
    }
  }

  onClick(): void {
    if (!this.disabled()) {
      this.fileInput()?.nativeElement.click();
    }
  }

  handleFiles(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.processFiles(input.files);
      input.value = '';
    }
  }

  private processFiles(files: FileList): void {
    Array.from(files).forEach(f => {
      if (this.accept() === 'application/pdf' && f.type !== 'application/pdf') {
        return;
      }
      if (f.size > this.maxMB() * 1024 * 1024) {
        return;
      }
      this.onFile.emit({ name: f.name, size: f.size });
    });
  }
}

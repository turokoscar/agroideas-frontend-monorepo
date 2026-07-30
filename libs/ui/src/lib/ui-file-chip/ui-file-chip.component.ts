import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-file-chip',
  standalone: true,
  imports: [CommonModule],
  styleUrl: './ui-file-chip.component.css',
  template: `
    <div
      class="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
      [class.opacity-60]="disabled()"
    >
      <span class="material-symbols-outlined text-[18px] text-primary">description</span>

      @if (viewable()) {
        <button
          class="flex-1 truncate text-left hover:underline"
          [disabled]="disabled()"
          (click)="onView.emit()"
        >
          {{ name() }}
        </button>
      } @else {
        <span class="flex-1 truncate">{{ name() }}</span>
      }

      @if (sizeKB()) {
        <span class="text-xs text-muted-foreground">{{ sizeKB() }} KB</span>
      }

      @if (removable() && !disabled()) {
        <button
          class="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          (click)="onRemove.emit()"
          type="button"
        >
          <span class="material-symbols-outlined text-[16px]">close</span>
        </button>
      }
    </div>
  `
})
export class UiFileChipComponent {
  name = input.required<string>();
  size = input<number>(0);
  removable = input<boolean>(true);
  viewable = input<boolean>(false);
  disabled = input<boolean>(false);

  onRemove = output<void>();
  onView = output<void>();

  sizeKB = () => this.size() > 0 ? Math.round(this.size() / 1024) : 0;
}

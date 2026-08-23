import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ConvenioDetailTab {
    label: string;
    disabled?: boolean;
}

@Component({
    selector: 'app-convenio-detail-tabs',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="border-b border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 px-4 md:px-6 overflow-x-auto scrollbar-hide">
            <nav class="flex gap-6 md:gap-8 min-w-max">
                @for (tab of tabs(); track tab.label; let i = $index) {
                    <button
                        type="button"
                        (click)="select(i, tab.disabled)"
                        [disabled]="tab.disabled"
                        class="py-4 text-xs md:text-sm font-bold uppercase tracking-wide transition-all relative whitespace-nowrap"
                        [ngClass]="tab.disabled ? 'text-slate-400 opacity-50 cursor-not-allowed' : (activeIndex() === i ? 'text-primary' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200')">
                        {{ tab.label }}
                        @if (activeIndex() === i) {
                            <span class="absolute bottom-0 left-0 h-1 w-full bg-primary rounded-t-full"></span>
                        }
                    </button>
                }
            </nav>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConvenioDetailTabsComponent {
    tabs = input.required<ConvenioDetailTab[]>();
    activeIndex = input.required<number>();
    tabChange = output<number>();

    select(index: number, disabled?: boolean): void {
        if (disabled) return;
        this.tabChange.emit(index);
    }
}

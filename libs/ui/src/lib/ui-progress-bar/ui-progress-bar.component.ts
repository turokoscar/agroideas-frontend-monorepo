import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ProgressLevel = 'success' | 'warning' | 'danger' | 'full';

@Component({
    selector: 'app-ui-progress-bar',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './ui-progress-bar.component.html',
    styleUrls: ['./ui-progress-bar.component.sass']
})
export class UiProgressBarComponent {
    @Input() value = 0;
    @Input() showLabel = true;
    @Input() showPercentage = true;
    @Input() maxValue = 100;

    get percentage(): number {
        if (this.maxValue <= 0) return 0;
        return Math.min((this.value / this.maxValue) * 100, 100);
    }

    get level(): ProgressLevel {
        if (this.percentage >= 100) return 'full';
        if (this.percentage >= 50) return 'success';
        if (this.percentage >= 25) return 'warning';
        return 'danger';
    }
}

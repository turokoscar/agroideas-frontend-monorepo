import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type KpiVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'dark' | 'glass';
export type TrendDirection = 'up' | 'down' | 'neutral';

@Component({
    selector: 'app-ui-kpi',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './ui-kpi.component.html',
    styleUrls: ['./ui-kpi.component.sass']
})
export class UiKpiComponent {
    @Input() label = '';
    @Input() value = '';
    @Input() subtitle?: string;
    @Input() icon?: string;
    @Input() variant: KpiVariant = 'default';
    @Input() trend?: TrendDirection;
    @Input() trendValue?: string;
    @Input() trendLabel?: string;
    @Input() progress = 0;
    @Input() showProgress = false;

    private bgColors: Record<KpiVariant, string> = {
        'primary': 'hsl(118 64% 22%)',
        'dark': '#1e293b',
        'glass': 'white',
        'success': 'hsl(105 40% 94%)',
        'warning': 'hsl(36 80% 95%)',
        'info': 'hsl(193 60% 96%)',
        'danger': 'hsl(0 70% 96%)',
        'default': 'white'
    };

    private textColors: Record<KpiVariant, string> = {
        'primary': 'white',
        'dark': 'white',
        'glass': '#0f172a',
        'success': 'hsl(105 68% 43%)',
        'warning': 'hsl(36 88% 50%)',
        'info': 'hsl(193 100% 45%)',
        'danger': 'hsl(0 72% 51%)',
        'default': 'hsl(0 0% 0%)'
    };

    private borderColors: Record<KpiVariant, string> = {
        'success': '4px solid hsl(105 68% 43%)',
        'warning': '4px solid hsl(36 88% 50%)',
        'danger': '4px solid hsl(0 72% 51%)',
        'info': '4px solid hsl(193 100% 45%)',
        'default': '4px solid hsl(0 0% 87%)',
        'primary': 'none',
        'dark': 'none',
        'glass': 'none'
    };

    get backgroundColor(): string {
        return this.bgColors[this.variant] || this.bgColors['default'];
    }

    get textColor(): string {
        return this.textColors[this.variant] || this.textColors['default'];
    }

    get borderLeft(): string {
        return this.borderColors[this.variant] || this.borderColors['default'];
    }

    get iconBgClasses(): string {
        const classes: Record<KpiVariant, string> = {
            'default': 'bg-muted text-muted-foreground',
            'success': 'bg-success-soft text-success',
            'warning': 'bg-warning-soft text-warning',
            'danger': 'bg-danger-soft text-danger',
            'info': 'bg-info-soft text-info',
            'primary': 'bg-white/20 text-white',
            'dark': 'bg-white/10 text-white',
            'glass': 'bg-slate-100 text-slate-700'
        };
        return classes[this.variant];
    }

    getContainerClasses(): string {
        if (this.variant === 'primary') return 'text-white shadow-lg shadow-primary/20 rounded-xl p-6';
        if (this.variant === 'dark') return 'text-white shadow-xl shadow-slate-900/10 rounded-xl p-6';
        if (this.variant === 'glass') return 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6';
        return 'rounded-xl p-6 shadow-sm';
    }

    getTextClasses(): string {
        if (this.variant === 'primary' || this.variant === 'dark') return 'text-white';
        if (this.variant === 'glass') return 'text-slate-900 dark:text-white';
        if (this.variant === 'success') return 'text-success';
        if (this.variant === 'warning') return 'text-warning';
        if (this.variant === 'info') return 'text-info';
        if (this.variant === 'danger') return 'text-danger';
        return 'text-foreground';
    }

    getProgressClasses(): string {
        if (this.variant === 'primary' || this.variant === 'dark') return 'bg-white/40';
        if (this.variant === 'glass') return 'bg-primary';
        if (this.variant === 'success') return 'bg-success';
        if (this.variant === 'warning') return 'bg-warning';
        if (this.variant === 'info') return 'bg-info';
        if (this.variant === 'danger') return 'bg-danger';
        return 'bg-primary';
    }

    get trendColorClasses(): string {
        if (!this.trend) return '';
        const colors: Record<TrendDirection, string> = {
            'up': 'text-success',
            'down': 'text-danger',
            'neutral': 'text-muted-foreground'
        };
        return colors[this.trend];
    }

    get trendIcon(): string {
        if (!this.trend) return '';
        const icons: Record<TrendDirection, string> = {
            'up': 'arrow_upward',
            'down': 'arrow_downward',
            'neutral': 'remove'
        };
        return icons[this.trend];
    }
}

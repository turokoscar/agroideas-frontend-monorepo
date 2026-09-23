import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type KpiVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'dark' | 'glass';
export type TrendDirection = 'up' | 'down' | 'neutral';

interface KpiVariantStyle {
    /** Fondo, acento izquierdo y color de texto de la tarjeta. */
    container: string;
    icon: string;
    progress: string;
    track: string;
}

/**
 * Estilos por variante, solo con clases de tokens del tema (sin hex ni estilos inline).
 * Todas las variantes con acento llevan `border-l-4` (incluida `primary`, con el
 * acento del mismo color que el fondo) para que el contenido quede alineado en el grid.
 */
const VARIANT_STYLES: Record<KpiVariant, KpiVariantStyle> = {
    default: {
        container: 'border-l-4 border-l-border bg-card text-foreground',
        icon: 'bg-muted text-muted-foreground',
        progress: 'bg-primary',
        track: 'bg-black/10'
    },
    success: {
        container: 'border-l-4 border-l-success bg-success-soft text-success',
        icon: 'bg-success/15 text-success',
        progress: 'bg-success',
        track: 'bg-black/10'
    },
    warning: {
        container: 'border-l-4 border-l-warning bg-warning-soft text-warning',
        icon: 'bg-warning/15 text-warning',
        progress: 'bg-warning',
        track: 'bg-black/10'
    },
    danger: {
        container: 'border-l-4 border-l-danger bg-danger-soft text-danger',
        icon: 'bg-danger/15 text-danger',
        progress: 'bg-danger',
        track: 'bg-black/10'
    },
    info: {
        container: 'border-l-4 border-l-info bg-info-soft text-info',
        icon: 'bg-info/15 text-info',
        progress: 'bg-info',
        track: 'bg-black/10'
    },
    primary: {
        container: 'border-l-4 border-l-primary bg-primary text-primary-foreground',
        icon: 'bg-white/20 text-primary-foreground',
        progress: 'bg-white/70',
        track: 'bg-white/20'
    },
    dark: {
        container: 'border-l-4 border-l-slate-800 bg-slate-800 text-white',
        icon: 'bg-white/10 text-white',
        progress: 'bg-white/70',
        track: 'bg-white/20'
    },
    glass: {
        container: 'border border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white',
        icon: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
        progress: 'bg-primary',
        track: 'bg-black/10 dark:bg-white/10'
    }
};

const TREND_STYLES: Record<TrendDirection, { color: string; icon: string }> = {
    up: { color: 'text-success', icon: 'arrow_upward' },
    down: { color: 'text-danger', icon: 'arrow_downward' },
    neutral: { color: 'text-muted-foreground', icon: 'remove' }
};

/**
 * Tarjeta KPI. Ocupa todo el alto de su celda (`h-full`): en un grid, todas las
 * tarjetas de una fila miden lo mismo y la barra de progreso queda al pie.
 */
@Component({
    selector: 'app-ui-kpi',
    standalone: true,
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
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

    get styles(): KpiVariantStyle {
        return VARIANT_STYLES[this.variant] ?? VARIANT_STYLES.default;
    }

    /** Progreso acotado a [0, 100] para el ancho de la barra. */
    get progressWidth(): number {
        return Math.min(Math.max(Number(this.progress) || 0, 0), 100);
    }

    get trendColorClasses(): string {
        return this.trend ? TREND_STYLES[this.trend].color : '';
    }

    get trendIcon(): string {
        return this.trend ? TREND_STYLES[this.trend].icon : '';
    }
}

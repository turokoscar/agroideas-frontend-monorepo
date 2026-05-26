import { Component, Output, EventEmitter, input, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RippleModule } from 'primeng/ripple';

export type ButtonSeverity =
    | 'primary' | 'secondary' | 'accent'
    | 'success' | 'warning' | 'danger' | 'info'
    | 'outline' | 'ghost' | 'subtle';
export type ButtonAppearance = 'solid' | 'soft';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonShape = 'default' | 'circle';

@Component({
    selector: 'ui-button',
    standalone: true,
    imports: [CommonModule, RippleModule],
    host: {
        '[class.block]': 'block()',
        '[class.w-full]': 'block()',
    },
    template: `
        <button
          pRipple
          [type]="type()"
          [disabled]="disabled() || loading()"
          [attr.title]="ariaLabel() || null"
          [attr.aria-label]="ariaLabel() || label() || null"
          (click)="onClick.emit($event)"
          [ngClass]="buttonClasses()"
          class="group inline-flex items-center justify-center font-black transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 whitespace-nowrap"
          >
          @if (loading()) {
            <span class="material-symbols-outlined animate-spin" [ngClass]="iconSizeClass()">progress_activity</span>
          }
          @if (icon() && !loading()) {
            <span class="material-symbols-outlined transition-transform duration-300"
              [ngClass]="iconSizeClass() + (iconRotateOnHover() ? ' group-hover:rotate-90' : '')">{{ icon() }}</span>
          }
          @if (label() && !loading()) {
            <span>{{ label() }}</span>
          }
          @if (label() && loading()) {
            <span>Cargando...</span>
          }
          @if (!label() && !icon() && !loading()) {
            <ng-content></ng-content>
          }
        </button>
        `
})
export class UIButtonComponent {
    label = input<string>('');
    icon = input<string>('');
    severity = input<ButtonSeverity>('primary');
    appearance = input<ButtonAppearance>('solid');
    size = input<ButtonSize>('md');
    /** 'circle' usa `rounded-full` (FAB); 'default' usa el redondeo por tamaño. */
    shape = input<ButtonShape>('default');
    iconOnly = input(false, { transform: booleanAttribute });
    loading = input(false, { transform: booleanAttribute });
    disabled = input(false, { transform: booleanAttribute });
    /** Ocupa el ancho completo del contenedor (host w-full + botón interno w-full). */
    block = input(false, { transform: booleanAttribute });
    /** Rota el icono 90° al pasar el cursor (micro-interacción para botones "añadir"). */
    iconRotateOnHover = input(false, { transform: booleanAttribute });
    type = input<'button' | 'submit'>('button');
    ariaLabel = input<string>('');

    @Output() onClick = new EventEmitter<Event>();

    /** Forma y dimensiones según size + iconOnly. */
    private shapeClasses(): string {
        const circle = this.shape() === 'circle';
        if (this.iconOnly()) {
            return {
                sm: `w-8 h-8 ${circle ? 'rounded-full' : 'rounded-lg'} gap-0`,
                md: `w-10 h-10 ${circle ? 'rounded-full' : 'rounded-xl'} gap-0`,
                lg: `w-12 h-12 ${circle ? 'rounded-full' : 'rounded-xl'} gap-0`,
            }[this.size()];
        }
        return {
            sm: `px-3 py-1.5 text-xs gap-1.5 ${circle ? 'rounded-full' : 'rounded-lg'}`,
            md: `px-6 py-2.5 text-sm gap-2 ${circle ? 'rounded-full' : 'rounded-xl'}`,
            lg: `px-8 py-3 text-base gap-2 ${circle ? 'rounded-full' : 'rounded-xl'}`,
        }[this.size()];
    }

    iconSizeClass(): string {
        return { sm: 'text-base', md: 'text-lg', lg: 'text-xl' }[this.size()];
    }

    /** Color según appearance × severity. */
    private colorClasses(): string {
        const sev = this.severity();

        // Variantes que son apariencia por sí mismas.
        if (sev === 'outline') return 'border-2 border-primary text-primary bg-transparent hover:bg-primary/5';
        if (sev === 'ghost') return 'text-slate-500 bg-transparent hover:bg-slate-100 hover:text-slate-800';
        // 'subtle': botón bordeado discreto (fondo claro/oscuro + borde slate) que vira a primary al hover.
        if (sev === 'subtle') return 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 shadow-sm hover:border-primary hover:text-primary';

        if (this.appearance() === 'soft') {
            const soft: Record<string, string> = {
                primary: 'bg-primary/10 text-primary hover:bg-primary hover:text-white',
                secondary: 'bg-slate-100 text-slate-600 hover:bg-slate-600 hover:text-white',
                accent: 'bg-amber-500/10 text-amber-600 hover:bg-amber-600 hover:text-white',
                success: 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-600 hover:text-white',
                warning: 'bg-amber-500/10 text-amber-600 hover:bg-amber-600 hover:text-white',
                danger: 'bg-destructive/10 text-destructive hover:bg-destructive hover:text-white',
                info: 'bg-sky-500/10 text-sky-600 hover:bg-sky-600 hover:text-white',
            };
            return `${soft[sev] ?? soft['primary']} hover:scale-105`;
        }

        // appearance 'solid'
        const solid: Record<string, string> = {
            primary: 'bg-primary text-white shadow-premium hover:bg-primary/90 hover:shadow-premium-hover',
            secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
            accent: 'bg-accent text-accent-foreground shadow-premium hover:bg-accent/90 hover:shadow-premium-hover',
            success: 'bg-emerald-600 text-white hover:bg-emerald-700',
            warning: 'bg-amber-500 text-white hover:bg-amber-600',
            danger: 'bg-destructive text-white hover:bg-destructive/90',
            info: 'bg-sky-600 text-white hover:bg-sky-700',
        };
        return solid[sev] ?? solid['primary'];
    }

    buttonClasses(): string {
        const block = this.block() ? 'w-full' : '';
        return `${this.shapeClasses()} ${this.colorClasses()} ${block}`;
    }
}

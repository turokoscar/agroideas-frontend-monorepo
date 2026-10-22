import { Component, booleanAttribute, input, output } from '@angular/core';
import { NgClass, NgTemplateOutlet } from '@angular/common';

export type UiStepStatus = 'done' | 'current' | 'pending';

/** Paso de `ui-stepper`. `subtitle` suele ser el responsable de la etapa. */
export interface UiStep {
  key: string;
  title: string;
  subtitle?: string;
  status: UiStepStatus;
}

/**
 * Etapas de un proceso: completadas (✓), la actual (resaltada, `aria-current="step"`) y pendientes. Con `navigable`,
 * los pasos completados y el actual son botones que emiten `stepClick` (p. ej. para llevar a la tarjeta de esa etapa);
 * los pendientes no, porque aún no tienen nada que mostrar.
 */
@Component({
  selector: 'ui-stepper',
  standalone: true,
  host: { class: 'block' },
  imports: [NgClass, NgTemplateOutlet],
  template: `
    <ol class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-[repeat(var(--pasos),minmax(0,1fr))]" [style.--pasos]="steps().length"
      [attr.aria-label]="ariaLabel() || null">
      @for (step of steps(); track step.key; let i = $index) {
        <li>
          @if (navigable() && step.status !== 'pending') {
            <button type="button"
              class="flex w-full items-start gap-2 rounded-lg p-1 text-left transition-colors hover:bg-muted/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              [attr.aria-current]="step.status === 'current' ? 'step' : null"
              (click)="stepClick.emit(step.key)">
              <ng-container [ngTemplateOutlet]="contenido" [ngTemplateOutletContext]="{ $implicit: step, numero: i + 1 }" />
            </button>
          } @else {
            <div class="flex items-start gap-2 p-1" [attr.aria-current]="step.status === 'current' ? 'step' : null">
              <ng-container [ngTemplateOutlet]="contenido" [ngTemplateOutletContext]="{ $implicit: step, numero: i + 1 }" />
            </div>
          }
        </li>
      }
    </ol>

    <ng-template #contenido let-step let-numero="numero">
      <span
        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
        [ngClass]="circulo(step.status)"
      >
        @if (step.status === 'done') {
          <span class="material-symbols-outlined text-[16px]" aria-hidden="true">check</span>
          <span class="sr-only">Completada:</span>
        } @else {
          {{ numero }}
        }
      </span>
      <span class="min-w-0 text-[11px] leading-tight">
        <span class="block font-semibold" [class.text-foreground]="step.status !== 'pending'" [class.text-muted-foreground]="step.status === 'pending'">
          {{ step.title }}
        </span>
        @if (step.subtitle) {
          <span class="text-muted-foreground">{{ step.subtitle }}</span>
        }
      </span>
    </ng-template>
  `
})
export class UiStepperComponent {
  steps = input.required<readonly UiStep[]>();
  ariaLabel = input('');
  navigable = input(false, { transform: booleanAttribute });

  stepClick = output<string>();

  private readonly circulos: Readonly<Record<UiStepStatus, string>> = {
    done: 'bg-success text-success-foreground',
    current: 'bg-primary text-primary-foreground ring-4 ring-primary/20',
    pending: 'bg-muted text-muted-foreground'
  };

  protected circulo(status: UiStepStatus): string {
    return this.circulos[status];
  }
}

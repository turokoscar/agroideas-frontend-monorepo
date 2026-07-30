import { Component, input, computed, effect, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export type CountdownTone = 'primary' | 'warning' | 'destructive';

interface TimeParts {
  d: number;
  h: number;
  m: number;
  s: number;
}

function fmt(totalSec: number): TimeParts {
  if (totalSec <= 0) return { d: 0, h: 0, m: 0, s: 0 };
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return { d, h, m, s };
}

@Component({
  selector: 'ui-countdown-banner',
  standalone: true,
  imports: [CommonModule],
  styleUrl: './ui-countdown.component.css',
  template: `
    <div
      class="flex items-center justify-between gap-4 rounded-2xl border bg-gradient-to-r p-4 shadow-md transition-all duration-300"
      [ngClass]="bannerToneClass()"
    >
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
          <span class="material-symbols-outlined text-[20px] text-white">alarm</span>
        </div>
        <div>
          <div class="text-[11px] font-bold uppercase tracking-wider text-white/80">{{ label() }}</div>
          <div class="text-sm font-semibold text-white">
            @if (expired()) {
              Plazo vencido
            } @else {
              {{ timeParts().d }} días, {{ timeParts().h }} horas, {{ timeParts().m }} min, {{ timeParts().s | number:'2.0-0' }} s
            }
          </div>
        </div>
      </div>
      <div class="hidden items-center gap-1.5 font-mono text-2xl font-bold tabular-nums md:flex text-white">
        <div class="countdown-block">
          <span class="countdown-block-value bg-white/15 border border-white/20 text-white shadow-sm">{{ timeParts().d | number:'2.0-0' }}</span>
          <span class="countdown-block-suffix text-white/70">d</span>
        </div>
        <span class="countdown-sep text-white/60">:</span>
        <div class="countdown-block">
          <span class="countdown-block-value bg-white/15 border border-white/20 text-white shadow-sm">{{ timeParts().h | number:'2.0-0' }}</span>
          <span class="countdown-block-suffix text-white/70">h</span>
        </div>
        <span class="countdown-sep text-white/60">:</span>
        <div class="countdown-block">
          <span class="countdown-block-value bg-white/15 border border-white/20 text-white shadow-sm">{{ timeParts().m | number:'2.0-0' }}</span>
          <span class="countdown-block-suffix text-white/70">m</span>
        </div>
        <span class="countdown-sep text-white/60">:</span>
        <div class="countdown-block">
          <span class="countdown-block-value bg-white/15 border border-white/20 text-white shadow-sm">{{ timeParts().s | number:'2.0-0' }}</span>
          <span class="countdown-block-suffix text-white/70">s</span>
        </div>
      </div>
    </div>
  `
})
export class UiCountdownBannerComponent implements OnDestroy {
  hours = input<number>(0);
  tone = input<CountdownTone>('primary');
  label = input<string>('Tiempo restante de envío');

  private tick = signal(0);
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.intervalId = setInterval(() => {
      this.tick.update(t => t + 1);
    }, 1000);
  }

  private baseSec = computed(() => Math.max(0, Math.floor(this.hours() * 3600) - this.tick()));

  expired = computed(() => this.baseSec() <= 0);

  timeParts = computed(() => fmt(this.baseSec()));

  bannerToneClass = computed(() => {
    const tone = this.tone();
    if (tone === 'warning') return 'from-warning to-accent border-warning/30 shadow-warning/10';
    if (tone === 'destructive') return 'from-destructive to-danger border-destructive/30 shadow-destructive/10';
    return 'from-primary to-secondary border-primary/30 shadow-primary/10';
  });

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}

@Component({
  selector: 'ui-countdown-ring',
  standalone: true,
  imports: [CommonModule],
  styleUrl: './ui-countdown.component.css',
  template: `
    <div class="flex flex-col items-center">
      <div class="relative" [style.width.px]="size()" [style.height.px]="size()">
        <svg [attr.width]="size()" [attr.height]="size()" class="-rotate-90">
          <circle
            [attr.cx]="size() / 2"
            [attr.cy]="size() / 2"
            [attr.r]="radius()"
            stroke="var(--muted)"
            [attr.stroke-width]="stroke"
            fill="none"
          />
          <circle
            [attr.cx]="size() / 2"
            [attr.cy]="size() / 2"
            [attr.r]="radius()"
            [attr.stroke]="ringColor()"
            [attr.stroke-width]="stroke"
            fill="none"
            stroke-linecap="round"
            [attr.stroke-dasharray]="circumference()"
            [attr.stroke-dashoffset]="strokeOffset()"
          />
        </svg>
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <span class="material-symbols-outlined mb-1 h-5 w-5 text-muted-foreground">schedule</span>
          <div class="text-3xl font-bold tabular-nums">{{ remainingDays() }}</div>
          <div class="text-xs uppercase tracking-wider text-muted-foreground">días restantes</div>
        </div>
      </div>
      @if (label()) {
        <div class="mt-3 text-sm font-medium">{{ label() }}</div>
      }
    </div>
  `
})
export class UiCountdownRingComponent {
  totalDays = input<number>(15);
  elapsedDays = input<number>(0);
  size = input<number>(180);
  label = input<string>('');
  forceExpire = input<boolean>(false);

  readonly stroke = 12;

  radius = computed(() => (this.size() - this.stroke) / 2);

  circumference = computed(() => 2 * Math.PI * this.radius());

  pct = computed(() => this.forceExpire() ? 1 : Math.min(1, this.elapsedDays() / this.totalDays()));

  remainingDays = computed(() => this.forceExpire() ? 0 : Math.max(0, this.totalDays() - this.elapsedDays()));

  strokeOffset = computed(() => this.circumference() * (1 - this.pct()));

  ringColor = computed(() => {
    const r = this.remainingDays();
    const t = this.totalDays();
    if (this.forceExpire() || r < t * 0.15) return 'var(--destructive)';
    if (r < t * 0.4) return 'var(--warning)';
    return 'var(--primary)';
  });
}

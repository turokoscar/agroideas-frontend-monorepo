import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  computed,
  effect,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  ChartConfiguration,
  DoughnutController,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  TooltipItem,
} from 'chart.js';

let registered = false;

/**
 * Registro explícito (tree-shaking): solo lo que ui-chart expone. Se hace al
 * dibujar el primer gráfico y no al cargar el módulo: un efecto secundario a
 * nivel de módulo metería Chart.js en el bundle inicial de toda app que importe
 * el barrel `@agroideas/ui`, aunque la ruta con gráficos sea lazy.
 */
function registerChartJs(): void {
  if (registered) return;
  Chart.register(
    LineController,
    LineElement,
    PointElement,
    BarController,
    BarElement,
    DoughnutController,
    ArcElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend
  );
  registered = true;
}

export type UiChartType = 'line' | 'bar' | 'doughnut';

/** Tokens de `@agroideas/theme` (tokens.css). Nunca hex: el color vive en el tema. */
export type UiChartColor =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'accent'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'muted';

export type UiChartValueFormat = 'number' | 'currency' | 'percent';

export interface UiChartDataset {
  label: string;
  data: number[];
  /** Un token para toda la serie, o uno por segmento (doughnut). */
  color: UiChartColor | UiChartColor[];
}

/** Por debajo de este ancho los montos del eje Y se abrevian (S/ 1.2 M). */
const COMPACT_BREAKPOINT = 480;

/**
 * Gráfico genérico sobre Chart.js. Las apps nunca importan `chart.js`
 * (regla `no-restricted-imports`): describen datos y tokens de color, y este
 * componente resuelve colores desde las variables CSS del tema, formato es-PE
 * y una tabla oculta para lectores de pantalla (el canvas es opaco para ellos).
 *
 * En `doughnut`, el contenido proyectado se centra sobre el anillo.
 */
@Component({
  selector: 'app-ui-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ui-chart.component.html',
  styles: [':host { display: block; }'],
})
export class UiChartComponent implements OnDestroy {
  type = input.required<UiChartType>();
  labels = input.required<string[]>();
  datasets = input.required<UiChartDataset[]>();
  /** Descripción del gráfico para lectores de pantalla. */
  ariaLabel = input.required<string>();
  valueFormat = input<UiChartValueFormat>('number');
  height = input('300px');
  showLegend = input(true);
  showTooltip = input(true);
  /** Grosor del anillo en `doughnut` (porcentaje del radio vacío). */
  cutout = input('78%');

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private chart?: Chart;

  /** Filas de la tabla accesible: una por etiqueta, un valor por serie. */
  readonly rows = computed(() =>
    this.labels().map((label, i) => ({
      label,
      values: this.datasets().map((ds) => this.format(ds.data[i] ?? 0)),
    }))
  );

  /** El canvas existe en el DOM (solo navegador, tras el primer render). */
  private readonly viewReady = signal(false);

  constructor() {
    afterNextRender(() => this.viewReady.set(true));

    effect(() => {
      if (!this.viewReady()) return;
      const config = this.buildConfig();
      untracked(() => (this.chart ? this.update(config) : this.render(config)));
    });
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  /**
   * `full`: valor exacto (tooltip, tabla). `axis`: sin decimales (eje Y).
   * `compact`: abreviado (S/ 1.2 M) para ejes en pantallas angostas.
   */
  format(value: number, mode: 'full' | 'axis' | 'compact' = 'full'): string {
    const format = this.valueFormat();
    if (format === 'percent') {
      return new Intl.NumberFormat('es-PE', { style: 'percent', maximumFractionDigits: 1 }).format(value / 100);
    }
    const digits =
      mode === 'compact'
        ? { notation: 'compact' as const, maximumFractionDigits: 1 }
        : mode === 'axis'
          ? { minimumFractionDigits: 0, maximumFractionDigits: 0 }
          : { maximumFractionDigits: 2 };
    return new Intl.NumberFormat('es-PE', {
      ...(format === 'currency' ? { style: 'currency', currency: 'PEN' } : {}),
      ...digits,
    }).format(value);
  }

  private render(config: ChartConfiguration): void {
    const ctx = this.canvas().nativeElement.getContext('2d');
    // Sin contexto 2D (p. ej. jsdom en tests) no hay nada que dibujar.
    if (!ctx) return;
    registerChartJs();
    this.chart = new Chart(ctx, config);
  }

  private update(config: ChartConfiguration): void {
    if (!this.chart) return;
    if ((this.chart.config as ChartConfiguration).type !== config.type) {
      this.chart.destroy();
      this.chart = undefined;
      this.render(config);
      return;
    }
    this.chart.data = config.data;
    this.chart.options = config.options ?? {};
    this.chart.update();
  }

  private buildConfig(): ChartConfiguration {
    const type = this.type();
    const isDoughnut = type === 'doughnut';
    const text = this.color('muted-foreground');
    const grid = this.color('border', 0.5);

    return {
      type,
      data: {
        labels: this.labels(),
        datasets: this.datasets().map((ds) => {
          const colors = Array.isArray(ds.color) ? ds.color.map((c) => this.color(c)) : this.color(ds.color);
          return {
            label: ds.label,
            data: ds.data,
            backgroundColor: colors,
            borderColor: isDoughnut ? this.color('card') : colors,
            borderWidth: isDoughnut ? 0 : 2,
            // Monotone: suaviza sin sobrepasar los datos (no dibuja montos negativos).
            cubicInterpolationMode: 'monotone',
            pointRadius: 3,
            pointHoverRadius: 5,
            borderRadius: type === 'bar' ? 4 : 0,
          };
        }),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: isDoughnut ? undefined : { mode: 'index', intersect: false },
        ...(isDoughnut ? { cutout: this.cutout() } : {}),
        plugins: {
          legend: {
            display: this.showLegend(),
            position: 'top',
            align: 'end',
            labels: { color: text, usePointStyle: true, boxHeight: 6, font: { size: 12 } },
          },
          tooltip: {
            enabled: this.showTooltip(),
            callbacks: {
              label: (item: TooltipItem<UiChartType>) => {
                const value = typeof item.parsed === 'number' ? item.parsed : (item.parsed as { y: number }).y;
                const label = isDoughnut ? item.label : item.dataset.label;
                return ` ${label}: ${this.format(value)}`;
              },
            },
          },
        },
        scales: isDoughnut
          ? {}
          : {
              x: { grid: { display: false }, ticks: { color: text, font: { size: 11 } } },
              y: {
                beginAtZero: true,
                border: { display: false },
                grid: { color: grid },
                ticks: {
                  color: text,
                  font: { size: 11 },
                  maxTicksLimit: 6,
                  // El eje muestra enteros: sin esto, con todo en 0 Chart.js usa pasos
                  // de 0.2 y las etiquetas redondeadas se repiten (S/ 1, S/ 1, S/ 0…).
                  precision: this.valueFormat() === 'percent' ? undefined : 0,
                  callback: (value) =>
                    this.format(Number(value), (this.chart?.width ?? Infinity) < COMPACT_BREAKPOINT ? 'compact' : 'axis'),
                },
              },
            },
      },
    } as ChartConfiguration;
  }

  /** Lee el token HSL (`118 64% 22%`) del tema y lo devuelve como color CSS. */
  private color(token: UiChartColor | 'muted-foreground' | 'border' | 'card', alpha = 1): string {
    if (typeof document === 'undefined') return 'currentColor';
    const hsl = getComputedStyle(document.documentElement).getPropertyValue(`--${token}`).trim();
    return hsl ? `hsl(${hsl} / ${alpha})` : 'currentColor';
  }
}

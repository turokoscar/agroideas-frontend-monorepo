import { ApplicationRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Chart } from 'chart.js';
import { UiChartComponent, UiChartDataset } from './ui-chart.component';

jest.mock('chart.js', () => {
  const actual = jest.requireActual('chart.js');
  const MockChart = jest.fn().mockImplementation((_ctx, config) => ({
    config,
    width: 800,
    data: config.data,
    options: config.options,
    update: jest.fn(),
    destroy: jest.fn(),
  }));
  (MockChart as unknown as { register: jest.Mock }).register = jest.fn();
  return { ...actual, Chart: MockChart };
});

describe('UiChartComponent', () => {
  let component: UiChartComponent;
  let fixture: ComponentFixture<UiChartComponent>;
  const ChartMock = Chart as unknown as jest.Mock;

  const datasets: UiChartDataset[] = [
    { label: 'Programado', data: [1000, 2500], color: 'info' },
    { label: 'Ejecutado', data: [500, 0], color: 'success' },
  ];

  /** detectChanges no dispara afterNextRender: hace falta un tick y luego vaciar los effects. */
  const render = (f: ComponentFixture<UiChartComponent>) => {
    f.detectChanges();
    TestBed.inject(ApplicationRef).tick();
    TestBed.flushEffects();
  };

  const lastConfig = () => ChartMock.mock.calls[ChartMock.mock.calls.length - 1][1];

  beforeEach(async () => {
    ChartMock.mockClear();
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as CanvasRenderingContext2D);
    document.documentElement.style.setProperty('--info', '193 100% 45%');

    await TestBed.configureTestingModule({ imports: [UiChartComponent] }).compileComponents();

    fixture = TestBed.createComponent(UiChartComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('type', 'line');
    fixture.componentRef.setInput('labels', ['Ene', 'Feb']);
    fixture.componentRef.setInput('datasets', datasets);
    fixture.componentRef.setInput('ariaLabel', 'Ejecución mensual');
    fixture.componentRef.setInput('valueFormat', 'currency');
    render(fixture);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    document.documentElement.style.removeProperty('--info');
  });

  it('creates the Chart.js instance after render', () => {
    expect(ChartMock).toHaveBeenCalledTimes(1);
    expect(lastConfig().type).toBe('line');
    expect(lastConfig().data.labels).toEqual(['Ene', 'Feb']);
  });

  it('resolves colors from theme tokens instead of hex', () => {
    expect(lastConfig().data.datasets[0].borderColor).toBe('hsl(193 100% 45% / 1)');
  });

  it('uses integer ticks on the Y axis so rounded labels never repeat', () => {
    expect(lastConfig().options.scales.y.ticks.precision).toBe(0);
  });

  it('updates the existing chart when inputs change', () => {
    const chart = ChartMock.mock.results[0].value;
    fixture.componentRef.setInput('labels', ['Ene', 'Feb', 'Mar']);
    render(fixture);

    expect(ChartMock).toHaveBeenCalledTimes(1);
    expect(chart.update).toHaveBeenCalled();
    expect(chart.data.labels).toEqual(['Ene', 'Feb', 'Mar']);
  });

  it('recreates the chart when the type changes', () => {
    const chart = ChartMock.mock.results[0].value;
    fixture.componentRef.setInput('type', 'bar');
    render(fixture);

    expect(chart.destroy).toHaveBeenCalled();
    expect(lastConfig().type).toBe('bar');
  });

  it('destroys the chart on destroy', () => {
    const chart = ChartMock.mock.results[0].value;
    fixture.destroy();
    expect(chart.destroy).toHaveBeenCalled();
  });

  it('skips rendering when there is no 2D context', () => {
    ChartMock.mockClear();
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const other = TestBed.createComponent(UiChartComponent);
    other.componentRef.setInput('type', 'line');
    other.componentRef.setInput('labels', []);
    other.componentRef.setInput('datasets', []);
    other.componentRef.setInput('ariaLabel', 'Vacío');
    render(other);

    expect(ChartMock).not.toHaveBeenCalled();
  });

  it('formats values in es-PE currency for tooltip, axis and compact modes', () => {
    // Intl separa el símbolo con un espacio sin salto (U+00A0).
    const plain = (v: string) => v.replace(/\u00a0/g, ' ');
    expect(plain(component.format(1500.5))).toBe('S/ 1,500.50');
    expect(plain(component.format(200000, 'axis'))).toBe('S/ 200,000');
    expect(component.format(1_250_000, 'compact')).toMatch(/1[.,]3\s?M/);
  });

  it('renders an accessible table with one row per label', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('canvas')?.getAttribute('aria-label')).toBe('Ejecución mensual');
    const rows = el.querySelectorAll('table tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Ene');
  });

  it('projects center content only for doughnut charts', () => {
    expect(fixture.nativeElement.querySelector('.pointer-events-none')).toBeNull();
    fixture.componentRef.setInput('type', 'doughnut');
    render(fixture);
    expect(fixture.nativeElement.querySelector('.pointer-events-none')).not.toBeNull();
  });
});

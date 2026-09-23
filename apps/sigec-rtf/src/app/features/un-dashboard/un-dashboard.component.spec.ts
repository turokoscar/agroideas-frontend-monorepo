import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { UnDashboardComponent } from './un-dashboard.component';
import { RtfService } from '../../core/services/rtf.service';
import { ConvenioGeneralService } from '../../core/services/convenio-general.service';
import { DashboardUnData } from '../../core/models';

describe('UnDashboardComponent', () => {
  let fixture: ComponentFixture<UnDashboardComponent>;
  let component: UnDashboardComponent;
  let dashboardUnData: ReturnType<typeof signal<DashboardUnData | null>>;
  let loadDashboardUn: jest.Mock;

  const data = (over: Partial<DashboardUnData> = {}): DashboardUnData => ({
    totalRtfs: 20,
    aprobados: 5,
    rechazados: 1,
    pendientes: 3,
    enEdicion: 2,
    enRevision: 4,
    inRevisionUn: 1,
    vencidos: 3,
    avanceFisicoPromedio: 40,
    avanceFinancieroPromedio: 55,
    convenios: [],
    ...over,
  });

  beforeEach(async () => {
    dashboardUnData = signal<DashboardUnData | null>(null);
    loadDashboardUn = jest.fn().mockImplementation(() => {
      dashboardUnData.set(data());
      return of(data());
    });

    await TestBed.configureTestingModule({
      imports: [UnDashboardComponent],
      providers: [
        { provide: RtfService, useValue: { dashboardUnData, loadDashboardUn } },
        { provide: ConvenioGeneralService, useValue: { obtenerPorIds: jest.fn().mockReturnValue(of(new Map())) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UnDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('carga el dashboard al iniciar', () => {
    expect(loadDashboardUn).toHaveBeenCalled();
    expect(component.loading()).toBe(false);
    expect(component.hasError()).toBe(false);
  });

  it('agrupa los RTF en proceso (pendientes, edición, revisión y gabinete)', () => {
    expect(component.enProceso()).toBe(10);
    expect(component.enProcesoPct()).toBe(50);
  });

  it('agrupa vencidos y rechazados como críticos', () => {
    expect(component.criticos()).toBe(4);
    expect(component.criticosPct()).toBe(20);
    expect(component.aprobadosPct()).toBe(25);
  });

  it('evita dividir entre cero cuando no hay RTFs', () => {
    dashboardUnData.set(data({ totalRtfs: 0, aprobados: 0 }));

    expect(component.aprobadosPct()).toBe(0);
    expect(component.enProcesoPct()).toBe(0);
    expect(component.criticosPct()).toBe(0);
  });

  it('pinta el semáforo con el token según el avance financiero', () => {
    expect(component.semaforoColor()).toBe('warning');
    expect(component.semaforoTextClass()).toBe('text-warning');
    expect(component.semaforoDatasets()[0]).toEqual(
      expect.objectContaining({ data: [55, 45], color: ['warning', 'muted'] })
    );

    dashboardUnData.set(data({ avanceFinancieroPromedio: 70 }));
    expect(component.semaforoColor()).toBe('success');
    dashboardUnData.set(data({ avanceFinancieroPromedio: 29.4 }));
    expect(component.semaforoColor()).toBe('danger');
  });

  it('arma la distribución por estado con porcentaje en la etiqueta y color por estado', () => {
    expect(component.breakdownLabels()[0]).toBe('Aprobado (25%)');
    const [ds] = component.breakdownDatasets();
    expect(ds.data).toEqual([5, 5, 5, 1, 3]);
    expect(ds.color).toEqual(['success', 'warning', 'info', 'danger', 'danger']);
  });

  it('dibuja los dos gráficos con app-ui-chart', () => {
    const charts = fixture.nativeElement.querySelectorAll('app-ui-chart canvas');
    expect(charts.length).toBe(2);
    expect(charts[0].getAttribute('aria-label')).toContain('55%');
  });

  it('renderiza los 4 KPIs con app-ui-kpi', () => {
    const kpis = Array.from(fixture.nativeElement.querySelectorAll('app-ui-kpi') as NodeListOf<HTMLElement>)
      .map((k) => k.textContent ?? '');

    expect(kpis.length).toBe(4);
    expect(kpis[0]).toContain('Total RTFs');
    expect(kpis[0]).toContain('20');
    expect(kpis[2]).toContain('En Proceso');
    expect(kpis[3]).toContain('Vencidos / Rechazados');
  });

  it('muestra el error y no los KPIs si falla la carga', () => {
    dashboardUnData.set(null);
    loadDashboardUn.mockReturnValue(throwError(() => new Error('boom')));

    component.reload();
    fixture.detectChanges();

    expect(component.hasError()).toBe(true);
    expect(fixture.nativeElement.querySelectorAll('app-ui-kpi').length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('Error al cargar datos');
  });
});

import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { UiKpiComponent, UiPaginationComponent } from '@agroideas/ui';
import { UiChartColor, UiChartComponent, UiChartDataset } from '@agroideas/ui/chart';
import { formatConvenioNumber } from '@agroideas/utils';
import { RtfService } from '../../core/services/rtf.service';
import { ConvenioGeneralService } from '../../core/services/convenio-general.service';
import { ConvenioResumenDto } from '../../core/models';

@Component({
  selector: 'app-un-dashboard',
  standalone: true,
  imports: [CommonModule, DecimalPipe, UiPaginationComponent, UiKpiComponent, UiChartComponent],
  providers: [DecimalPipe],
  templateUrl: './un-dashboard.component.html',
})
export class UnDashboardComponent implements OnInit {
  rtfService = inject(RtfService);
  private convenioGeneralService = inject(ConvenioGeneralService);

  loading = signal(false);
  hasError = signal(false);

  dashboard = this.rtfService.dashboardUnData;

  // Paginación client-side: sigec-api-rtf no pagina esta lista (llega completa en un solo
  // request), así que se pagina en memoria.
  pageSize = signal(10);
  currentPage = signal(1);

  totalConvenios = computed(() => this.dashboard()?.convenios.length ?? 0);

  pagedConvenios = computed(() => {
    const todos = this.dashboard()?.convenios ?? [];
    const inicio = (this.currentPage() - 1) * this.pageSize();
    return todos.slice(inicio, inicio + this.pageSize());
  });

  // RUC/razón social/número de convenio no existen en sigec-api-rtf (solo ideConvenio) — se
  // resuelven contra sel-api-general (convenios/por-ids), una vez que se conoce la lista de
  // ideConvenio que trajo el propio dashboard (ADR-013: antes se reutilizaba "mi cartera", que
  // devolvía vacío para un Administrador del sistema al no tener convenios asignados
  // personalmente).
  conveniosInfo = signal<Map<number, ConvenioResumenDto>>(new Map());
  loadingConveniosInfo = signal(false);

  private cargarConveniosInfo(ideConvenios: number[]) {
    this.loadingConveniosInfo.set(true);
    this.convenioGeneralService.obtenerPorIds([...new Set(ideConvenios)]).subscribe({
      next: mapa => {
        this.conveniosInfo.set(mapa);
        this.loadingConveniosInfo.set(false);
      },
      error: () => this.loadingConveniosInfo.set(false)
    });
  }

  onPageChange(page: number) {
    this.currentPage.set(page);
  }

  // Mismo formato que kofix-ejecucion: NNNN-YYYY-ST. "periodo" viene en 0 para convenios
  // reales (gap de datos en sel-api-general) — se usa fechaFirma como año, igual que
  // formatConvenioNumber(numeroConvenio, fechaInicio) en @agroideas/utils.
  formatConvenio(info: ConvenioResumenDto): string {
    return formatConvenioNumber(info.numeroConvenio, info.fechaFirma);
  }

  avanceFinanciero = computed(() => Math.round(this.dashboard()?.avanceFinancieroPromedio ?? 0));

  semaforoVerde = computed(() => this.avanceFinanciero() >= 70);
  semaforoAmbar = computed(() => this.avanceFinanciero() >= 30 && this.avanceFinanciero() < 70);
  semaforoRojo = computed(() => this.avanceFinanciero() < 30);

  /** Token del semáforo, compartido por el anillo, el ícono y el porcentaje central. */
  semaforoColor = computed<UiChartColor>(() => (this.semaforoVerde() ? 'success' : this.semaforoAmbar() ? 'warning' : 'danger'));
  /** Clases literales: Tailwind no detecta clases armadas dinámicamente (`text-${color}`). */
  private static readonly SEMAFORO_TEXT: Partial<Record<UiChartColor, string>> = {
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
  };
  semaforoTextClass = computed(() => UnDashboardComponent.SEMAFORO_TEXT[this.semaforoColor()] ?? '');

  /** Anillo: avance promedio + resto hasta 100%. */
  semaforoDatasets = computed<UiChartDataset[]>(() => {
    const avance = Math.min(Math.max(this.avanceFinanciero(), 0), 100);
    return [{ label: 'Avance financiero', data: [avance, 100 - avance], color: [this.semaforoColor(), 'muted'] }];
  });

  aprobadosPct = computed(() => this.pctDelTotal(this.dashboard()?.aprobados ?? 0));

  // --- KPIs (mismo diseño que el resumen ejecutivo de kofix: app-ui-kpi de @agroideas/ui) ---

  /** RTFs aún en trámite: pendientes, en edición, en revisión y en evaluación de gabinete. */
  enProceso = computed(() => {
    const d = this.dashboard();
    return d ? d.pendientes + d.enEdicion + d.enRevision + d.inRevisionUn : 0;
  });
  enProcesoPct = computed(() => this.pctDelTotal(this.enProceso()));

  /** RTFs que requieren atención: vencidos o rechazados. */
  criticos = computed(() => {
    const d = this.dashboard();
    return d ? d.vencidos + d.rechazados : 0;
  });
  criticosPct = computed(() => this.pctDelTotal(this.criticos()));

  private pctDelTotal(parte: number): number {
    const total = this.dashboard()?.totalRtfs ?? 0;
    return total > 0 ? Math.round((parte / total) * 100) : 0;
  }

  breakdown = computed(() => {
    const d = this.dashboard();
    if (!d || d.totalRtfs === 0) return [];
    const total = d.totalRtfs;
    return [
      { key: 'APROBADO', label: 'Aprobado', count: d.aprobados, pct: Math.round((d.aprobados / total) * 100) },
      { key: 'PENDIENTE', label: 'Pendiente + Edici\u00F3n', count: d.pendientes + d.enEdicion, pct: Math.round(((d.pendientes + d.enEdicion) / total) * 100) },
      { key: 'EN_REVISION', label: 'En Revisi\u00F3n + Gabinete', count: d.enRevision + d.inRevisionUn, pct: Math.round(((d.enRevision + d.inRevisionUn) / total) * 100) },
      { key: 'RECHAZADO', label: 'Rechazado', count: d.rechazados, pct: Math.round((d.rechazados / total) * 100) },
      { key: 'VENCIDO', label: 'Vencido', count: d.vencidos, pct: Math.round((d.vencidos / total) * 100) },
    ];
  });

  /** Color de cada barra de "Distribución por Estado", por clave de estado. */
  private static readonly BREAKDOWN_COLOR: Record<string, UiChartColor> = {
    APROBADO: 'success',
    PENDIENTE: 'warning',
    EN_REVISION: 'info',
    RECHAZADO: 'danger',
    VENCIDO: 'danger',
  };

  /** Etiquetas con el porcentaje del total, p.ej. "Aprobado (25%)". */
  breakdownLabels = computed(() => this.breakdown().map((b) => `${b.label} (${b.pct}%)`));

  breakdownDatasets = computed<UiChartDataset[]>(() => {
    const items = this.breakdown();
    return [{
      label: 'RTFs',
      data: items.map((b) => b.count),
      color: items.map((b) => UnDashboardComponent.BREAKDOWN_COLOR[b.key] ?? 'primary'),
    }];
  });

  ngOnInit() {
    this.reload();
  }

  reload() {
    this.loading.set(true);
    this.hasError.set(false);
    this.currentPage.set(1);
    this.rtfService.loadDashboardUn().subscribe({
      next: data => {
        this.loading.set(false);
        this.cargarConveniosInfo((data?.convenios ?? []).map(c => c.ideConvenio));
      },
      error: () => {
        this.loading.set(false);
        this.hasError.set(true);
      }
    });
  }
}

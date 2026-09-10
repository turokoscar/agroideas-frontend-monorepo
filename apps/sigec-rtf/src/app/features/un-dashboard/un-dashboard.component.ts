import { Component, inject, signal, computed, effect, untracked, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { UiPaginationComponent } from '@agroideas/ui';
import { formatConvenioNumber } from '@agroideas/utils';
import { RtfService } from '../../core/services/rtf.service';
import { ConvenioGeneralService } from '../../core/services/convenio-general.service';
import { ConvenioResumenDto } from '../../core/models';

@Component({
  selector: 'app-un-dashboard',
  standalone: true,
  imports: [CommonModule, DecimalPipe, UiPaginationComponent],
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
  // request), así que se pagina en memoria. RUC/razón social/número de convenio no existen en
  // sigec-api-rtf (solo ideConvenio) — se resuelven aparte contra sel-api-general, y solo para
  // los convenios de la página visible, para no disparar N requests por los 100 de golpe.
  pageSize = signal(10);
  currentPage = signal(1);

  totalConvenios = computed(() => this.dashboard()?.convenios.length ?? 0);

  pagedConvenios = computed(() => {
    const todos = this.dashboard()?.convenios ?? [];
    const inicio = (this.currentPage() - 1) * this.pageSize();
    return todos.slice(inicio, inicio + this.pageSize());
  });

  conveniosInfo = signal<Map<number, ConvenioResumenDto>>(new Map());
  loadingConveniosInfo = signal(false);

  constructor() {
    effect(() => {
      const ids = this.pagedConvenios().map(c => c.ideConvenio);
      untracked(() => this.cargarInfoConvenios(ids));
    });
  }

  private cargarInfoConvenios(ids: number[]) {
    const cache = this.conveniosInfo();
    const faltantes = ids.filter(id => !cache.has(id));
    if (faltantes.length === 0) return;

    this.loadingConveniosInfo.set(true);
    this.convenioGeneralService.obtenerResumenPorIds(faltantes).subscribe({
      next: nuevos => {
        const actualizado = new Map(this.conveniosInfo());
        nuevos.forEach((info, id) => actualizado.set(id, info));
        this.conveniosInfo.set(actualizado);
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

  avanceFisico = computed(() => Math.round(this.dashboard()?.avanceFisicoPromedio ?? 0));

  semaforoVerde = computed(() => this.avanceFisico() >= 70);
  semaforoAmbar = computed(() => this.avanceFisico() >= 30 && this.avanceFisico() < 70);
  semaforoRojo = computed(() => this.avanceFisico() < 30);

  aprobadosPct = computed(() => {
    const d = this.dashboard();
    if (!d || d.totalRtfs === 0) return 0;
    return Math.round((d.aprobados / d.totalRtfs) * 100);
  });

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

  ngOnInit() {
    this.reload();
  }

  reload() {
    this.loading.set(true);
    this.hasError.set(false);
    this.currentPage.set(1);
    this.rtfService.loadDashboardUn().subscribe({
      next: () => this.loading.set(false),
      error: () => {
        this.loading.set(false);
        this.hasError.set(true);
      }
    });
  }
}

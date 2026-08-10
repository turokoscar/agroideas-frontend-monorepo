import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RtfService } from '../../core/services/rtf.service';

@Component({
  selector: 'app-un-dashboard',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  providers: [DecimalPipe],
  templateUrl: './un-dashboard.component.html',
})
export class UnDashboardComponent implements OnInit {
  rtfService = inject(RtfService);

  loading = signal(false);
  hasError = signal(false);

  dashboard = this.rtfService.dashboardUnData;

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
    this.rtfService.loadDashboardUn().subscribe({
      next: () => this.loading.set(false),
      error: () => {
        this.loading.set(false);
        this.hasError.set(true);
      }
    });
  }
}

import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { RtfService } from '../../core/services/rtf.service';
import { AuthService } from '../../core/services/auth.service';
import { FormatConvenioPipe } from '../../core/pipes/format-convenio.pipe';
import { switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-oa-dashboard',
  standalone: true,
  imports: [CommonModule, DecimalPipe, RouterModule, FormatConvenioPipe],
  providers: [DecimalPipe],
  templateUrl: './oa-dashboard.component.html'
})
export class OaDashboardComponent implements OnInit {
  rtfService = inject(RtfService);
  authService = inject(AuthService);
  private router = inject(Router);

  isLoading = signal(true);
  hasError = signal(false);
  observacionesPendientes = signal(0);

  activePasoCriticoId = computed(() => {
    const pasos = this.rtfService.pasos();
    const active = pasos.find(p => p.status === 'Activo') || pasos[0];
    return active?.id ?? this.rtfService.activePasoNumero();
  });

  /** ADR-014 (frontend) Fase 4: rtfId del paso activo, para poder abrir su pliego de observaciones. */
  private activeRtfId = computed(() => {
    const pasos = this.rtfService.pasos();
    const active = pasos.find(p => p.status === 'Activo') || pasos[0];
    return active?.rtfId ?? null;
  });

  ngOnInit() {
    this.reload();
  }

  reload() {
    this.isLoading.set(true);
    this.hasError.set(false);

    const usuarioId = Number(this.authService.user()?.id);
    if (!usuarioId) {
      this.hasError.set(true);
      this.isLoading.set(false);
      return;
    }

    this.rtfService.resolvePostulanteId().pipe(
      switchMap(postulanteId => {
        if (!postulanteId) return of(null);
        return this.rtfService.loadDashboard(postulanteId);
      }),
      switchMap(() => this.rtfService.loadActividadReciente())
    ).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.cargarObservacionesPendientes();
      },
      error: () => {
        this.isLoading.set(false);
        this.hasError.set(true);
      }
    });
  }

  /**
   * ADR-014 (frontend) Fase 4: cuenta las observaciones abiertas del RTF activo, para el badge
   * del tile "Pliego de Observaciones" -- solo tiene sentido pedirlo si el paso activo está
   * OBSERVADO; en cualquier otro estado no hay nada que contar.
   */
  private cargarObservacionesPendientes() {
    const rtfId = this.activeRtfId();
    if (this.rtfService.rtfStatus() !== 'OBSERVADO' || !rtfId) {
      this.observacionesPendientes.set(0);
      return;
    }
    this.rtfService.obtenerEvaluacionUr(rtfId).subscribe({
      next: estado => {
        const count = (estado?.revisiones ?? []).filter(r => r.estConformidad === 'OBSERVADO' && r.estAtencion !== 'ATENDIDA').length;
        this.observacionesPendientes.set(count);
      },
      error: () => { /* silencioso: el tile simplemente no muestra el badge de conteo */ }
    });
  }

  /** El tile de observaciones necesita fijar el rtfId correcto antes de navegar -- `rtfId` es una
   * señal global que puede haber quedado apuntando a otro RTF visto antes (mismo criterio que
   * `BandejaOAComponent.atenderObservaciones`). */
  irAObservaciones() {
    const rtfId = this.activeRtfId();
    if (rtfId) this.rtfService.rtfId.set(rtfId);
    this.router.navigate(['/rtf/pasos-criticos/observaciones']);
  }

  get financialProgress(): number {
    const budget = this.rtfService.budget();
    if (budget <= 0) return 0;
    return Math.round((this.rtfService.disbursed() / budget) * 100);
  }

  get currentMonthPct(): number {
    return (this.rtfService.currentMonth() / this.rtfService.durationMonths()) * 100;
  }

  get monthLabels(): number[] {
    const total = this.rtfService.durationMonths();
    const step = Math.max(1, Math.floor(total / 12));
    const labels: number[] = [];
    for (let i = 1; i <= total; i += step) {
      labels.push(i);
    }
    if (labels[labels.length - 1] !== total) {
      labels.push(total);
    }
    return labels;
  }

  statusLabel(): string {
    const status = this.rtfService.rtfStatus();
    switch (status) {
      case 'PENDIENTE': return 'En Edición';
      case 'ENVIADO': return 'Enviado a UR';
      case 'EN_REVISION': return 'En Revisión';
      case 'APROBADO': return 'Aprobado';
      case 'RECHAZADO': return 'Rechazado';
      case 'VENCIDO': return 'Vencido';
      case 'OBSERVADO': return 'Con Observaciones';
      default: return status;
    }
  }

  pasoClass(status: string): string {
    switch (status) {
      case 'Aprobado':
      case 'Validado':
        return 'bg-success text-success-foreground';
      case 'Activo':
        return 'bg-primary text-primary-foreground';
      default:
        return 'bg-surface-container text-muted-foreground';
    }
  }

  pasoBadgeClass(status: string): string {
    switch (status) {
      case 'Aprobado':
      case 'Validado':
        return 'bg-success-soft border-success/20 text-success';
      case 'Activo':
        return 'bg-primary-soft border-primary/20 text-primary';
      default:
        return 'bg-surface-container border-border text-muted-foreground';
    }
  }

  actividadIconClass(tipo: string): string {
    switch (tipo) {
      case 'aprobado': return 'text-success';
      case 'desembolso': return 'text-primary';
      case 'edicion': return 'text-amber-500';
      case 'observacion': return 'text-warning';
      case 'envio': return 'text-info';
      case 'vencido': return 'text-destructive';
      case 'alerta': return 'text-amber-500';
      default: return 'text-muted-foreground';
    }
  }
}

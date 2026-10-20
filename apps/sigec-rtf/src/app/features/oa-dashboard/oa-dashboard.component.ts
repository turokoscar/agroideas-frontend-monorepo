import { Component, DestroyRef, inject, OnInit, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { RtfService } from '../../core/services/rtf.service';
import { AuthService } from '../../core/services/auth.service';
import { FormatConvenioPipe } from '../../core/pipes/format-convenio.pipe';
import { KpiVariant, UiCountdownBannerComponent, UiKpiComponent } from '@agroideas/ui';
import { environment } from '../../../environments/environment';
import { CierreService } from '../../core/services/cierre.service';
import { ETIQUETA_ESTADO_CIERRE, ExpedienteCierreDto, PlazoCierreDto } from '../../core/models';
import { switchMap } from 'rxjs/operators';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-oa-dashboard',
  standalone: true,
  imports: [CommonModule, DecimalPipe, RouterModule, FormatConvenioPipe, UiKpiComponent, UiCountdownBannerComponent],
  providers: [DecimalPipe],
  templateUrl: './oa-dashboard.component.html'
})
export class OaDashboardComponent implements OnInit {
  rtfService = inject(RtfService);
  authService = inject(AuthService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private decimal = inject(DecimalPipe);
  private cierreService = inject(CierreService);

  /**
   * ADR 0013 del monorepo (Fase A): hito de cierre al final del cronograma. `undefined` mientras carga;
   * null si el expediente aún no se abre. Un fallo de la API de Cierre no afecta al resto del dashboard.
   */
  expedienteCierre = signal<ExpedienteCierreDto | null | undefined>(undefined);
  cierreNoDisponible = signal(false);
  /** Plazo vigente del Anexo 20 cuando el expediente espera que la OA lo presente. */
  plazoAnexo20 = signal<PlazoCierreDto | null>(null);
  readonly urlMiCierre = `${environment.cierre.urlApp}/mi-cierre`;
  readonly etiquetaEstadoCierre = ETIQUETA_ESTADO_CIERRE;

  /** Horas que quedan del plazo del Anexo 20, para `ui-countdown-banner`. */
  horasPlazoAnexo20 = computed(() => {
    const plazo = this.plazoAnexo20();
    return plazo ? Math.max(0, (new Date(plazo.fecLimite).getTime() - Date.now()) / 3_600_000) : 0;
  });

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
      switchMap(() => this.rtfService.loadActividadReciente()),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.cargarObservacionesPendientes();
        this.cargarCierre();
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
    this.rtfService.obtenerEvaluacionUr(rtfId).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: estado => {
        const count = (estado?.revisiones ?? []).filter(r => r.estConformidad === 'OBSERVADO' && r.estAtencion !== 'ATENDIDA').length;
        this.observacionesPendientes.set(count);
      },
      error: () => { /* silencioso: el tile simplemente no muestra el badge de conteo */ }
    });
  }

  private cargarCierre() {
    const postulanteId = this.rtfService.postulanteId();
    if (!postulanteId) return;
    this.cierreService.obtenerExpediente(postulanteId).pipe(
      switchMap(expediente =>
        expediente?.estCierre === 'ESPERA_ANEXO20'
          ? this.cierreService.listarPlazos(expediente.ideCierreConvenio).pipe(
              map(plazos => ({ expediente, plazo: plazos.find(p => p.tipPlazo === 'ANEXO20' && p.estPlazo === 'VIGENTE') ?? null }))
            )
          : of({ expediente, plazo: null })
      ),
      catchError(() => {
        this.cierreNoDisponible.set(true);
        return of({ expediente: null, plazo: null });
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(({ expediente, plazo }) => {
      this.expedienteCierre.set(expediente);
      this.plazoAnexo20.set(plazo);
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
    const duration = this.rtfService.durationMonths();
    if (duration <= 0) return 0;
    return (this.rtfService.currentMonth() / duration) * 100;
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

  /** Delegado a `RtfService.estadoLabel` -- fuente única de etiquetas (hallazgo #8, ver ahí). */
  statusLabel(): string {
    return this.rtfService.rtfStatusLabel();
  }

  /** Color del KPI "Paso Crítico Actual": fuente única en `RtfService.estadoKpiVariant`. */
  readonly estadoKpiVariant = computed<KpiVariant>(() => this.rtfService.estadoKpiVariant(this.rtfService.rtfStatus()));

  get pasosProgress(): number {
    const total = this.rtfService.totalPasos();
    if (total <= 0) return 0;
    return Math.round((this.rtfService.activePasoNumero() / total) * 100);
  }

  /** Monto en soles sin decimales, con el formato del LOCALE_ID de la app. */
  soles(value: number): string {
    return `S/ ${this.decimal.transform(value, '1.0-0') ?? '0'}`;
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

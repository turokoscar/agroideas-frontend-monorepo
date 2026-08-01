import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RtfService } from '../../core/services/rtf.service';
import { AuthService } from '../../core/services/auth.service';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-oa-dashboard',
  standalone: true,
  imports: [CommonModule, DecimalPipe, RouterModule],
  providers: [DecimalPipe],
  template: `
    <div class="space-y-6 animate-fade-in">

      <!-- Welcome Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-foreground">Dashboard General</h1>
          <p class="text-sm text-muted-foreground">
            Vista consolidada del plan de negocios · <span class="font-medium text-primary">{{ rtfService.oa() }}</span>
          </p>
        </div>
        <div class="flex items-center gap-2">
          <div class="flex items-center gap-2 text-xs bg-surface-container border border-border px-3 py-1.5 rounded-lg">
            <span class="material-symbols-outlined text-[16px] text-muted-foreground">calendar_today</span>
            <span class="text-muted-foreground">Convenio:</span>
            <span class="font-bold text-foreground">{{ rtfService.convenioId() }}</span>
          </div>
          <a
            [routerLink]="['/rtf/pasos-criticos', activePasoCriticoId(), 'registrar']"
            class="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <span class="material-symbols-outlined text-[16px]">edit_note</span>
            Registrar RTF
          </a>
        </div>
      </div>

      <!-- Loading State -->
      @if (isLoading()) {
        <div class="flex items-center justify-center py-16">
          <div class="flex flex-col items-center gap-3">
            <span class="material-symbols-outlined animate-spin text-[32px] text-primary">progress_activity</span>
            <span class="text-sm text-muted-foreground">Cargando datos del dashboard...</span>
          </div>
        </div>
      }

      <!-- Error State -->
      @if (hasError() && !isLoading()) {
        <div class="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <span class="material-symbols-outlined text-[32px] text-destructive">error_outline</span>
          <p class="mt-2 text-sm font-medium text-foreground">Error al cargar datos</p>
          <p class="mt-1 text-xs text-muted-foreground">No se pudieron cargar los datos del dashboard. Intente nuevamente.</p>
          <button
            class="mt-4 rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            (click)="reload()"
          >
            Reintentar
          </button>
        </div>
      }

      <!-- Main Content -->
      @if (!isLoading() && !hasError()) {

        <!-- CTA Banner if RTF is PENDIENTE -->
        @if (rtfService.rtfStatus() === 'PENDIENTE' || rtfService.rtfStatus() === 'EN_EDICION') {
          <div class="flex items-center justify-between gap-4 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5 p-4">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                <span class="material-symbols-outlined text-[22px] text-primary">assignment</span>
              </div>
              <div>
                <div class="text-sm font-semibold text-foreground">RTF del Paso Crítico {{ rtfService.activePasoNumero() }} pendiente</div>
                <div class="text-xs text-muted-foreground">Complete el formulario de registro y envíe el RTF dentro del plazo establecido.</div>
              </div>
            </div>
            <a
              [routerLink]="['/rtf/pasos-criticos', activePasoCriticoId(), 'registrar']"
              class="shrink-0 rounded-xl bg-primary px-5 py-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Ir a Registrar
            </a>
          </div>
        }

        <!-- KPI Summary Cards -->
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div class="bg-surface-container-lowest border border-border p-5 rounded-xl transition-all hover:shadow-md">
            <div class="flex items-center justify-between">
              <span class="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Convenio Activo</span>
              <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <span class="material-symbols-outlined text-[20px]">assignment</span>
              </div>
            </div>
            <div class="mt-3 text-xl font-bold tracking-tight text-foreground">{{ rtfService.convenioId() }}</div>
            <div class="mt-1 text-xs text-success font-medium flex items-center gap-1">
              <span class="h-1.5 w-1.5 rounded-full bg-success"></span>
              Vigente · {{ rtfService.durationMonths() }} meses
            </div>
          </div>

          <div class="bg-surface-container-lowest border border-primary/30 p-5 rounded-xl transition-all hover:shadow-md">
            <div class="flex items-center justify-between">
              <span class="text-xs uppercase tracking-wider text-primary font-semibold">Paso Crítico Actual</span>
              <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <span class="material-symbols-outlined text-[20px]">star</span>
              </div>
            </div>
            <div class="mt-3 text-xl font-bold tracking-tight text-foreground">
              {{ rtfService.activePasoNumero() }} de {{ rtfService.totalPasos() }}
            </div>
            <div class="mt-1 flex items-center gap-2">
              <span class="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              <span class="text-xs font-semibold uppercase" [ngClass]="{
                'text-success': rtfService.rtfStatus() === 'APROBADO' || rtfService.rtfStatus() === 'ENVIADO',
                'text-amber-500': rtfService.rtfStatus() === 'PENDIENTE',
                'text-destructive': rtfService.rtfStatus() === 'VENCIDO'
              }">
                {{ statusLabel() }}
              </span>
            </div>
          </div>

          <div class="bg-surface-container-lowest border border-border p-5 rounded-xl transition-all hover:shadow-md">
            <div class="flex items-center justify-between">
              <span class="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Avance Físico</span>
              <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-info/10 text-info">
                <span class="material-symbols-outlined text-[20px]">trending_up</span>
              </div>
            </div>
            <div class="mt-3 text-xl font-bold tracking-tight text-foreground">{{ rtfService.physicalProgress() }}%</div>
            <div class="mt-3 w-full bg-surface-container rounded-full h-1.5">
              <div class="bg-info h-1.5 rounded-full" [style.width.%]="rtfService.physicalProgress()"></div>
            </div>
          </div>

          <div class="bg-surface-container-lowest border border-border p-5 rounded-xl transition-all hover:shadow-md">
            <div class="flex items-center justify-between">
              <span class="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Desembolso</span>
              <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10 text-success">
                <span class="material-symbols-outlined text-[20px]">payments</span>
              </div>
            </div>
            <div class="mt-3 text-xl font-bold tracking-tight text-foreground">
              S/ {{ rtfService.disbursed() | number:'1.0-0' }}
            </div>
            <div class="mt-1 text-xs text-muted-foreground">
              de S/ {{ rtfService.budget() | number:'1.0-0' }}
            </div>
            <div class="mt-2 w-full bg-surface-container rounded-full h-1.5">
              <div class="bg-success h-1.5 rounded-full" [style.width.%]="financialProgress"></div>
            </div>
          </div>
        </div>

        <!-- Gantt Chronogram -->
        <div class="bg-surface-container-lowest border border-border rounded-xl p-6">
          <h2 class="text-base font-bold text-foreground mb-4 flex items-center gap-2">
            <span class="material-symbols-outlined text-primary text-[20px]">timeline</span>
            Cronograma de Convenio · {{ rtfService.totalPasos() }} Pasos Críticos
          </h2>

          @if (rtfService.pasos().length === 0) {
            <div class="py-8 text-center text-sm text-muted-foreground">
              No hay pasos críticos registrados para este convenio.
            </div>
          } @else {
            <div class="space-y-4">
              <div class="grid grid-cols-12 gap-1 text-[10px] text-muted-foreground text-center font-mono border-b border-border pb-1">
                @for (m of monthLabels; track m) {
                  <div>{{ m }}</div>
                }
              </div>
              <div class="relative space-y-3 pt-2">
                <div
                  class="absolute top-0 z-10 h-full w-0.5 bg-primary"
                  [style.left.%]="currentMonthPct"
                >
                  <div class="absolute -top-1 -left-1 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-primary/20"></div>
                </div>

                @for (paso of rtfService.pasos(); track paso.id) {
                  <div class="flex items-center gap-3">
                    <div class="w-28 text-xs font-semibold text-foreground">{{ paso.label }}</div>
                    <div class="relative h-8 flex-1 rounded bg-surface-container/30 overflow-hidden">
                      <div
                        class="absolute top-0 h-full flex items-center justify-between rounded px-2.5 text-[10px] font-bold shadow-sm transition-all"
                        [ngClass]="pasoClass(paso.status)"
                        [style.left.%]="(paso.startMonth / rtfService.durationMonths()) * 100"
                        [style.width.%]="((paso.endMonth - paso.startMonth) / rtfService.durationMonths()) * 100"
                      >
                        <span class="truncate">{{ paso.start | date:'MMM yy':'':'es' }}</span>
                        <span class="truncate">{{ paso.end | date:'MMM yy':'':'es' }}</span>
                      </div>
                    </div>
                    <div class="w-24 text-right">
                      <span
                        class="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border"
                        [ngClass]="pasoBadgeClass(paso.status)"
                      >
                        {{ paso.status }}
                      </span>
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        </div>

        <!-- KOFIX Disbursements & Activity -->
        <div class="grid gap-6 lg:grid-cols-2">
          <!-- KOFIX Disbursements -->
          <div class="bg-surface-container-lowest border border-border rounded-xl p-5">
            <h3 class="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <span class="material-symbols-outlined text-success text-[18px]">account_balance</span>
              Desembolsos recientes (KOFIX)
            </h3>
            @if (rtfService.disbursements().length === 0) {
              <div class="py-8 text-center text-sm text-muted-foreground">No hay desembolsos registrados.</div>
            } @else {
              <div class="space-y-3">
                @for (d of rtfService.disbursements(); track d.id) {
                  <div class="flex items-center justify-between border border-border bg-surface-container/20 p-3 rounded-lg hover:bg-surface-container/40 transition-colors">
                    <div>
                      <div class="text-xs font-semibold text-foreground">{{ d.item }}</div>
                      <div class="text-[10px] text-muted-foreground mt-0.5">{{ d.date }}</div>
                    </div>
                    <div class="text-right">
                      <div class="text-xs font-bold text-primary">S/ {{ d.amount | number:'1.0-0' }}</div>
                      <span class="inline-block text-[9px] font-semibold text-success bg-success-soft border border-success/15 px-1.5 py-0.5 rounded mt-1 uppercase">{{ d.status }}</span>
                    </div>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Recent Activity Feed -->
          <div class="bg-surface-container-lowest border border-border rounded-xl p-5">
            <h3 class="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <span class="material-symbols-outlined text-info text-[18px]">notifications</span>
              Actividad reciente
            </h3>
            @if (rtfService.actividadReciente().length === 0) {
              <div class="py-8 text-center text-sm text-muted-foreground">No hay actividad reciente.</div>
            } @else {
              <ul class="space-y-3 text-xs">
                @for (a of rtfService.actividadReciente(); track a.id) {
                  <li class="flex items-start gap-3 border border-border bg-surface-container/20 p-3 rounded-lg">
                    <span class="material-symbols-outlined text-[18px] mt-0.5" [ngClass]="actividadIconClass(a.tipo)">{{ a.icono }}</span>
                    <div class="flex-1">
                      <div class="text-foreground font-medium">{{ a.mensaje }}</div>
                      <div class="text-[10px] text-muted-foreground mt-0.5">{{ a.tiempo }}</div>
                    </div>
                  </li>
                }
              </ul>
            }
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="grid gap-4 sm:grid-cols-3">
          <a
            [routerLink]="['/rtf/pasos-criticos', activePasoCriticoId(), 'registrar']"
            class="flex items-center gap-3 rounded-xl border border-border bg-surface-container-lowest p-4 hover:bg-surface-container/40 transition-colors"
          >
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <span class="material-symbols-outlined text-[22px]">edit_note</span>
            </div>
            <div>
              <div class="text-sm font-semibold text-foreground">Registrar RTF</div>
              <div class="text-xs text-muted-foreground">Formulario 4 pestañas</div>
            </div>
          </a>
          <a
            routerLink="/rtf/reportes/metas-fisicas"
            class="flex items-center gap-3 rounded-xl border border-border bg-surface-container-lowest p-4 hover:bg-surface-container/40 transition-colors"
          >
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10 text-info">
              <span class="material-symbols-outlined text-[22px]">bar_chart</span>
            </div>
            <div>
              <div class="text-sm font-semibold text-foreground">Reporte Físico</div>
              <div class="text-xs text-muted-foreground">Metas programadas vs ejecutadas</div>
            </div>
          </a>
          <a
            routerLink="/rtf/pasos-criticos/observaciones"
            class="flex items-center gap-3 rounded-xl border border-border bg-surface-container-lowest p-4 hover:bg-surface-container/40 transition-colors"
          >
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning">
              <span class="material-symbols-outlined text-[22px]">feedback</span>
            </div>
            <div>
              <div class="text-sm font-semibold text-foreground">Observaciones</div>
              <div class="text-xs text-muted-foreground">Levantar observaciones UR/UN</div>
            </div>
          </a>
        </div>

      }
    </div>
  `
})
export class OaDashboardComponent implements OnInit {
  rtfService = inject(RtfService);
  authService = inject(AuthService);

  isLoading = signal(true);
  hasError = signal(false);

  activePasoCriticoId = computed(() => {
    const pasos = this.rtfService.pasos();
    const active = pasos.find(p => p.status === 'Activo') || pasos[0];
    return active?.id ?? this.rtfService.activePasoNumero();
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
      switchMap(postulanteId => this.rtfService.loadDashboard(postulanteId)),
      switchMap(() => this.rtfService.loadActividadReciente())
    ).subscribe({
      next: () => this.isLoading.set(false),
      error: () => {
        this.isLoading.set(false);
        this.hasError.set(true);
      }
    });
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

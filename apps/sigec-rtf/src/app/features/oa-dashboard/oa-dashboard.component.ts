import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RtfService, PasoCritico, Disbursement } from '../../core/services/rtf.service';

@Component({
  selector: 'app-oa-dashboard',
  standalone: true,
  imports: [CommonModule],
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
        <div class="flex items-center gap-2 text-xs bg-surface-container border border-border px-3 py-1.5 rounded-lg">
          <span class="material-symbols-outlined text-[16px] text-muted-foreground">calendar_today</span>
          <span class="text-muted-foreground">Convenio:</span>
          <span class="font-bold text-foreground">{{ rtfService.convenioId() }}</span>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <!-- Convenio Status -->
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
            Vigente · 36 meses
          </div>
        </div>

        <!-- Critical Step -->
        <div class="bg-surface-container-lowest border border-primary/30 p-5 rounded-xl transition-all hover:shadow-md">
          <div class="flex items-center justify-between">
            <span class="text-xs uppercase tracking-wider text-primary font-semibold">Paso Crítico Actual</span>
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <span class="material-symbols-outlined text-[20px]">star</span>
            </div>
          </div>
          <div class="mt-3 text-xl font-bold tracking-tight text-foreground">2 de 6</div>
          <div class="mt-1 text-xs text-muted-foreground font-medium">
            Estado: <span class="text-amber-500 font-bold">{{ rtfService.rtfStatus() }}</span>
          </div>
        </div>

        <!-- Physical Progress -->
        <div class="bg-surface-container-lowest border border-border p-5 rounded-xl transition-all hover:shadow-md">
          <div class="flex items-center justify-between">
            <span class="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Avance Físico</span>
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-info/10 text-info">
              <span class="material-symbols-outlined text-[20px]">trending_up</span>
            </div>
          </div>
          <div class="mt-3 text-xl font-bold tracking-tight text-foreground">32%</div>
          <div class="mt-3 w-full bg-surface-container rounded-full h-1.5">
            <div class="bg-info h-1.5 rounded-full" style="width: 32%"></div>
          </div>
        </div>

        <!-- Financial Progress -->
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
            <div class="bg-success h-1.5 rounded-full" [style.width.%]="getFinancialProgressPercentage()"></div>
          </div>
        </div>
      </div>

      <!-- Gantt Chronogram -->
      <div class="bg-surface-container-lowest border border-border rounded-xl p-6">
        <h2 class="text-base font-bold text-foreground mb-4 flex items-center gap-2">
          <span class="material-symbols-outlined text-primary text-[20px]">timeline</span>
          Cronograma de Convenio · 6 Pasos Críticos
        </h2>
        <div class="space-y-4">
          <!-- Month labels -->
          <div class="grid grid-cols-12 gap-1 text-[10px] text-muted-foreground text-center font-mono border-b border-border pb-1">
            <div *ngFor="let m of [1,4,7,10,13,16,19,22,25,28,31,34]">Mes {{m}}</div>
          </div>
          <!-- Gantt chart bars -->
          <div class="relative space-y-3 pt-2">
            <!-- Current month indicator vertical line -->
            <div 
              class="absolute top-0 z-10 h-full w-0.5 bg-primary" 
              [style.left.%]="(rtfService.currentMonth() / rtfService.durationMonths()) * 100"
            >
              <div class="absolute -top-1 -left-1 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-primary/20"></div>
            </div>

            <!-- Paso Crítico Rows -->
            <div *ngFor="let paso of rtfService.pasos()" class="flex items-center gap-3">
              <div class="w-28 text-xs font-semibold text-foreground">{{ paso.label }}</div>
              <div class="relative h-8 flex-1 rounded bg-surface-container/30 overflow-hidden">
                <div 
                  class="absolute top-0 h-full flex items-center justify-between rounded px-2.5 text-[10px] font-bold shadow-sm transition-all"
                  [ngClass]="getPasoClass(paso.status)"
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
                  [ngClass]="getPasoBadgeClass(paso.status)"
                >
                  {{ paso.status }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- KOFIX Disbursements & Activity -->
      <div class="grid gap-6 lg:grid-cols-2">
        <!-- KOFIX Disbursements -->
        <div class="bg-surface-container-lowest border border-border rounded-xl p-5">
          <h3 class="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <span class="material-symbols-outlined text-success text-[18px]">account_balance</span>
            Desembolsos recientes (KOFIX)
          </h3>
          <div class="space-y-3">
            <div 
              *ngFor="let d of rtfService.disbursements()" 
              class="flex items-center justify-between border border-border bg-surface-container/20 p-3 rounded-lg hover:bg-surface-container/40 transition-colors"
            >
              <div>
                <div class="text-xs font-semibold text-foreground">{{ d.item }}</div>
                <div class="text-[10px] text-muted-foreground mt-0.5">
                  {{ d.date | date:'dd MMM yyyy':'':'es' }}
                </div>
              </div>
              <div class="text-right">
                <div class="text-xs font-bold text-primary">S/ {{ d.amount | number:'1.0-0' }}</div>
                <span class="inline-block text-[9px] font-semibold text-success bg-success-soft border border-success/15 px-1.5 py-0.5 rounded mt-1 uppercase">
                  {{ d.status }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Activity Feed -->
        <div class="bg-surface-container-lowest border border-border rounded-xl p-5">
          <h3 class="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <span class="material-symbols-outlined text-info text-[18px]">notifications</span>
            Actividad reciente
          </h3>
          <ul class="space-y-3 text-xs">
            <li class="flex items-start gap-3 border border-border bg-surface-container/20 p-3 rounded-lg">
              <span class="material-symbols-outlined text-success text-[18px] mt-0.5">check_circle</span>
              <div class="flex-1">
                <div class="text-foreground font-medium">Paso Crítico 1 aprobado por Especialista UN</div>
                <div class="text-[10px] text-muted-foreground mt-0.5">Hace 18 días</div>
              </div>
            </li>
            <li class="flex items-start gap-3 border border-border bg-surface-container/20 p-3 rounded-lg">
              <span class="material-symbols-outlined text-primary text-[18px] mt-0.5">paid</span>
              <div class="flex-1">
                <div class="text-foreground font-medium">Desembolso de S/ 25,000 para "Secadores Solares"</div>
                <div class="text-[10px] text-muted-foreground mt-0.5">Hace 12 días</div>
              </div>
            </li>
            <li class="flex items-start gap-3 border border-border bg-surface-container/20 p-3 rounded-lg">
              <span class="material-symbols-outlined text-amber-500 text-[18px] mt-0.5">hourglass_empty</span>
              <div class="flex-1">
                <div class="text-foreground font-medium">RTF de Paso Crítico 2 en edición por la OA</div>
                <div class="text-[10px] text-muted-foreground mt-0.5">Ahora</div>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  `
})
export class OaDashboardComponent implements OnInit {
  rtfService = inject(RtfService);

  ngOnInit() {
    this.rtfService.loadPasosCriticos(13348, 5043);
  }

  getFinancialProgressPercentage(): number {
    return Math.round((this.rtfService.disbursed() / this.rtfService.budget()) * 100);
  }

  getPasoClass(status: string): string {
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

  getPasoBadgeClass(status: string): string {
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
}

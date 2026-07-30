import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RtfService } from '../../core/services/rtf.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-bandeja-oa',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterModule],
  providers: [DatePipe],
  template: `
    <div class="space-y-6 animate-fade-in">

      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold tracking-tight text-foreground">Bandeja RTF</h2>
          <p class="text-sm text-muted-foreground">Todos los reportes t\u00E9cnico-financieros registrados</p>
        </div>
        <a
          routerLink="/rtf/pasos-criticos/registrar"
          class="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <span class="material-symbols-outlined text-[16px]">add</span>
          Nuevo RTF
        </a>
      </div>

      <!-- Tabs by estado -->
      <div class="flex flex-wrap gap-2">
        @for (tab of tabs; track tab.key) {
          <button
            class="px-4 py-2 rounded-xl text-xs font-semibold transition-all"
            [class.bg-primary]="activeTab() === tab.key"
            [class.text-primary-foreground]="activeTab() === tab.key"
            [class.bg-surface-container]="activeTab() !== tab.key"
            [class.text-muted-foreground]="activeTab() !== tab.key"
            [class.hover:bg-muted]="activeTab() !== tab.key"
            (click)="cambiarTab(tab.key)"
          >
            {{ tab.label }}
          </button>
        }
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="flex items-center justify-center py-16">
          <span class="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
          <span class="ml-3 text-sm text-muted-foreground">Cargando RTFs...</span>
        </div>
      }

      <!-- Empty state -->
      @if (!loading() && rtfService.oaBandejaList().length === 0) {
        <div class="flex flex-col items-center justify-center py-20 text-center">
          <span class="material-symbols-outlined text-5xl text-muted-foreground/40 mb-4">inbox</span>
          <p class="text-sm font-medium text-foreground">No hay RTFs en {{ activeTabLabel() }}</p>
          <p class="text-xs text-muted-foreground mt-1">Los RTFs aparecer\u00E1n aqu\u00ED seg\u00FAn su estado.</p>
        </div>
      }

      <!-- Table -->
      @if (!loading() && rtfService.oaBandejaList().length > 0) {
        <div class="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-border bg-muted/30">
                  <th class="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">ID</th>
                  <th class="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Convenio</th>
                  <th class="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Paso Cr\u00EDtico</th>
                  <th class="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Estado</th>
                  <th class="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Fec. L\u00EDmite</th>
                  <th class="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Fec. Registro</th>
                  <th class="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (rtf of rtfService.oaBandejaList(); track rtf.ideRtf) {
                  <tr class="border-b border-border hover:bg-muted/20 transition-colors">
                    <td class="px-4 py-3 font-mono text-xs">{{ rtf.ideRtf }}</td>
                    <td class="px-4 py-3 font-medium">{{ rtf.ideConvenio }}</td>
                    <td class="px-4 py-3">{{ rtf.numPasoCritico }}</td>
                    <td class="px-4 py-3">
                      <span class="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" [class]="estadoBadgeClass(rtf.estRtf)">
                        {{ statusLabel(rtf.estRtf) }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-xs">{{ rtf.fecLimite | date:'dd/MM/yyyy' }}</td>
                    <td class="px-4 py-3 text-xs">{{ rtf.fecRegistro | date:'dd/MM/yyyy' }}</td>
                    <td class="px-4 py-3 text-right">
                      <div class="flex items-center justify-end gap-1">
                        <a
                          [routerLink]="'/rtf/pasos-criticos/registrar'"
                          class="rounded-lg px-2.5 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
                          title="Ver RTF"
                        >
                          <span class="material-symbols-outlined text-[16px]">visibility</span>
                        </a>
                        @if (rtf.estRtf === 'PENDIENTE' || rtf.estRtf === 'EN_EDICION') {
                          <a
                            [routerLink]="'/rtf/pasos-criticos/registrar'"
                            class="rounded-lg px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                            title="Editar RTF"
                          >
                            <span class="material-symbols-outlined text-[16px]">edit</span>
                          </a>
                          <a
                            [routerLink]="'/rtf/pasos-criticos/enviar'"
                            class="rounded-lg px-2.5 py-1.5 text-xs font-medium text-success hover:bg-success/10 transition-colors"
                            title="Enviar RTF"
                          >
                            <span class="material-symbols-outlined text-[16px]">send</span>
                          </a>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- Pagination -->
        @if (totalPages() > 1) {
          <div class="flex items-center justify-between">
            <p class="text-xs text-muted-foreground">
              Mostrando {{ rtfService.oaBandejaList().length }} de {{ rtfService.oaBandejaTotal() }} RTFs
            </p>
            <div class="flex items-center gap-2">
              <button
                class="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-30"
                [disabled]="rtfService.oaBandejaPagina() <= 1"
                (click)="irPagina(rtfService.oaBandejaPagina() - 1)"
              >
                Anterior
              </button>
              <span class="text-xs text-muted-foreground">P\u00E1gina {{ rtfService.oaBandejaPagina() }}</span>
              <button
                class="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-30"
                [disabled]="rtfService.oaBandejaPagina() >= totalPages()"
                (click)="irPagina(rtfService.oaBandejaPagina() + 1)"
              >
                Siguiente
              </button>
            </div>
          </div>
        }
      }

    </div>
  `
})
export class BandejaOAComponent implements OnInit, OnDestroy {
  rtfService = inject(RtfService);
  private subs = new Subscription();

  tabs = [
    { key: 'PENDIENTE', label: 'Pendiente' },
    { key: 'EN_EDICION', label: 'En Edici\u00F3n' },
    { key: 'EN_REVISION', label: 'En Revisi\u00F3n' },
    { key: 'APROBADO', label: 'Aprobado' },
    { key: 'RECHAZADO', label: 'Rechazado' },
    { key: 'VENCIDO', label: 'Vencido' },
  ];

  loading = signal(false);

  activeTab = computed(() => this.rtfService.oaBandejaEstado());

  activeTabLabel = computed(() => {
    const tab = this.tabs.find(t => t.key === this.activeTab());
    return tab?.label ?? this.activeTab();
  });

  totalPages = computed(() => {
    const total = this.rtfService.oaBandejaTotal();
    return Math.max(1, Math.ceil(total / 10));
  });

  ngOnInit() {
    this.cargarBandeja();
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  private cargarBandeja() {
    this.loading.set(true);
    this.subs.add(
      this.rtfService.loadBandejaOA(this.activeTab(), this.rtfService.oaBandejaPagina()).subscribe({
        next: () => this.loading.set(false),
        error: () => this.loading.set(false)
      })
    );
  }

  cambiarTab(estado: string) {
    this.rtfService.oaBandejaPagina.set(1);
    this.rtfService.oaBandejaEstado.set(estado);
    this.cargarBandeja();
  }

  irPagina(pagina: number) {
    this.rtfService.oaBandejaPagina.set(pagina);
    this.cargarBandeja();
  }

  statusLabel(estado?: string): string {
    const map: Record<string, string> = {
      'PENDIENTE': 'Pendiente',
      'EN_EDICION': 'En Edici\u00F3n',
      'EN_REVISION': 'En Revisi\u00F3n',
      'APROBADO': 'Aprobado',
      'RECHAZADO': 'Rechazado',
      'VENCIDO': 'Vencido',
      'AUDITADO_CAMPO': 'Auditado Campo',
      'IN_REVISION_UN': 'En Gabinete',
    };
    return map[estado ?? ''] ?? estado ?? '';
  }

  estadoBadgeClass(estado?: string): string {
    switch (estado) {
      case 'APROBADO': return 'bg-success-soft border border-success/20 text-success';
      case 'RECHAZADO': return 'bg-destructive/10 border border-destructive/20 text-destructive';
      case 'VENCIDO': return 'bg-destructive/10 border border-destructive/20 text-destructive';
      case 'EN_EDICION': return 'bg-amber-500/10 border border-amber-500/20 text-amber-600';
      case 'PENDIENTE': return 'bg-amber-500/10 border border-amber-500/20 text-amber-600';
      case 'EN_REVISION': return 'bg-info/10 border border-info/20 text-info';
      case 'AUDITADO_CAMPO': return 'bg-info/10 border border-info/20 text-info';
      case 'IN_REVISION_UN': return 'bg-primary/10 border border-primary/20 text-primary';
      default: return 'bg-surface-container border border-border text-muted-foreground';
    }
  }
}

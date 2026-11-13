import { UIButtonComponent, UiKpiComponent, UiStateComponent } from '@agroideas/ui';
import { PermissionService } from '@agroideas/security';
import { PERMISSIONS, formatConvenioNumber, formatCurrency } from '@agroideas/utils';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Convenio } from '../../../domain/models/convenio.model';
import { ConvenioStateService } from '../../../shared/services/convenio-state.service';
import { KardexRepository } from '../../../domain/repositories/kardex.repository';
import { KardexConsolidado } from '../../../domain/models/kardex.model';
import { NoObjecionPageComponent } from '../no-objecion/no-objecion.page';
import { DesembolsoPageComponent } from '../desembolso/desembolso.page';
import { RendicionPageComponent } from '../rendicion/rendicion.page';
import { ConvenioDetailTab, ConvenioDetailTabsComponent } from '../../components/convenio-detail-tabs/convenio-detail-tabs.component';
import { KardexVarianzaTabComponent } from '../../components/kardex-varianza-tab/kardex-varianza-tab.component';
import { ChequesGerenciaTabComponent } from '../../components/cheques-gerencia-tab/cheques-gerencia-tab.component';

/** Identificador de cada pestaña; es también el valor de `?tab=` para enlazarla directamente. */
export type EjecucionTabId = 'no-objeciones' | 'desembolsos' | 'cheques' | 'rendiciones' | 'kardex';

interface EjecucionTab extends ConvenioDetailTab {
    id: EjecucionTabId;
}

/**
 * Espacio de trabajo dedicado de Ejecución (ADR-019 Fase 3): No Objeciones, Desembolsos,
 * Cheques de Gerencia, Rendiciones y Kardex & Varianza. Las pestañas se identifican por id, no
 * por posición, porque "Cheques de Gerencia" solo aparece con el permiso ACTIVAR_CHEQUES (ADR-020).
 */
@Component({
    selector: 'app-ejecucion-detail-page',
    standalone: true,
    imports: [
        CommonModule,
        UiKpiComponent,
        UIButtonComponent,
        UiStateComponent,
        ConvenioDetailTabsComponent,
        NoObjecionPageComponent,
        DesembolsoPageComponent,
        RendicionPageComponent,
        KardexVarianzaTabComponent,
        ChequesGerenciaTabComponent
    ],
    templateUrl: './ejecucion-detail.page.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class EjecucionDetailPageComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private kardexRepo = inject(KardexRepository);
    private permissionService = inject(PermissionService);
    public stateService = inject(ConvenioStateService);

    activeTab = signal<EjecucionTabId>('no-objeciones');
    kardexConsolidado = signal<KardexConsolidado[]>([]);
    loadingKardex = signal(false);

    /** La bandeja de cheques solo la ven el Supervisor de Monitoreo y el Administrador. */
    readonly puedeActivarCheques = computed(() => this.permissionService.hasPermission(PERMISSIONS.ACTIVAR_CHEQUES));

    readonly tabs = computed<EjecucionTab[]>(() => [
        { id: 'no-objeciones', label: 'No Objeciones' },
        { id: 'desembolsos', label: 'Desembolsos' },
        ...(this.puedeActivarCheques() ? [{ id: 'cheques' as const, label: 'Cheques de Gerencia' }] : []),
        { id: 'rendiciones', label: 'Rendiciones' },
        { id: 'kardex', label: 'Kardex & Varianza' }
    ]);

    /** Posición de la pestaña activa, para `app-convenio-detail-tabs`. */
    readonly activeTabIndex = computed(() => this.tabs().findIndex(t => t.id === this.activeTab()));

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.stateService.refresh(Number(id));
        }

        const tab = this.route.snapshot.queryParamMap.get('tab');
        if (tab) {
            this.setTabIndexByTab(tab);
        }
    }

    /** Abre la pestaña de `?tab=`; ignora valores desconocidos o pestañas sin permiso. */
    setTabIndexByTab(tab: string): void {
        const index = this.tabs().findIndex(t => t.id === tab);
        if (index >= 0) {
            this.setActiveTab(index);
        }
    }

    setActiveTab(index: number): void {
        const tab = this.tabs()[index];
        if (!tab) return;
        this.activeTab.set(tab.id);
        if (tab.id === 'kardex') {
            const convenio = this.stateService.convenio();
            if (convenio) {
                this.loadKardexConsolidado(convenio.id);
            }
        }
    }

    loadKardexConsolidado(postulanteId: number): void {
        this.loadingKardex.set(true);
        this.kardexRepo.getConsolidado(postulanteId).subscribe({
            next: (data) => {
                this.kardexConsolidado.set(data);
                this.loadingKardex.set(false);
            },
            error: () => {
                this.loadingKardex.set(false);
            }
        });
    }

    /** Desde el estado de error: no hay convenio al que volver. */
    irAConvenios(): void {
        this.router.navigate(['/main/convenios']);
    }

    goBack(): void {
        const convenio = this.stateService.convenio();
        this.router.navigate(['/main/convenios', convenio?.id ?? '']);
    }

    formatCurrency(value?: number): string {
        if (value === undefined) return '-';
        return formatCurrency(value);
    }

    formatConvenioNumber(convenio?: Convenio): string {
        if (!convenio) return '-';
        return formatConvenioNumber(convenio.numeroConvenio, convenio.fechaInicio);
    }
}

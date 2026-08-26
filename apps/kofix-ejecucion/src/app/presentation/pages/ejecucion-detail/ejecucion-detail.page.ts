import { UIButtonComponent, UiKpiComponent } from '@agroideas/ui';
import { formatConvenioNumber, formatCurrency } from '@agroideas/utils';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
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

/**
 * Espacio de trabajo dedicado de Ejecución (ADR-019 Fase 3): No Objeciones, Desembolsos,
 * Rendiciones y Kardex & Varianza, reutilizados sin cambios desde lo que antes eran las
 * pestañas 2-5 de `ConvenioDetailPageComponent`.
 */
@Component({
    selector: 'app-ejecucion-detail-page',
    standalone: true,
    imports: [
        CommonModule,
        UiKpiComponent,
        UIButtonComponent,
        ConvenioDetailTabsComponent,
        NoObjecionPageComponent,
        DesembolsoPageComponent,
        RendicionPageComponent,
        KardexVarianzaTabComponent
    ],
    templateUrl: './ejecucion-detail.page.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class EjecucionDetailPageComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private kardexRepo = inject(KardexRepository);
    public stateService = inject(ConvenioStateService);

    activeTabIndex = signal(0);
    kardexConsolidado = signal<KardexConsolidado[]>([]);
    loadingKardex = signal(false);

    readonly tabs: ConvenioDetailTab[] = [
        { label: 'No Objeciones' },
        { label: 'Desembolsos' },
        { label: 'Rendiciones' },
        { label: 'Kardex & Varianza' }
    ];

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

    setTabIndexByTab(tab: string): void {
        const index = ['no-objeciones', 'desembolsos', 'rendiciones', 'kardex'].indexOf(tab);
        if (index >= 0) {
            this.setActiveTab(index);
        }
    }

    setActiveTab(index: number): void {
        this.activeTabIndex.set(index);
        if (index === 3) {
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

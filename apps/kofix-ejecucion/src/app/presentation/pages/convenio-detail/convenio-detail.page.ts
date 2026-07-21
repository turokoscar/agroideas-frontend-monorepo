import { UIButtonComponent, UiKpiComponent, UiMapComponent } from '@agroideas/ui';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { GetConvenioByIdUseCase } from '../../../domain/usecases/get-convenio-by-id.usecase';
import { Convenio } from '../../../domain/models/convenio.model';
import { ConvenioStateService } from '../../../shared/services/convenio-state.service';
import { KardexRepository } from '../../../domain/repositories/kardex.repository';
import { KardexConsolidado } from '../../../domain/models/kardex.model';
import { AlertService } from '@agroideas/feedback';

import { ProgramacionItemsComponent } from '../../components/programacion-items/programacion-items.component';
import { NoObjecionPageComponent } from '../../pages/no-objecion/no-objecion.page';
import { DesembolsoPageComponent } from '../../pages/desembolso/desembolso.page';
import { RendicionPageComponent } from '../../pages/rendicion/rendicion.page';

@Component({
    selector: 'app-convenio-detail-page',
    standalone: true,
    imports: [
        CommonModule,
        ProgramacionItemsComponent,
        NoObjecionPageComponent,
        DesembolsoPageComponent,
        RendicionPageComponent,
        UiKpiComponent,
        UiMapComponent,
        UIButtonComponent
    ],
    templateUrl: './convenio-detail.page.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConvenioDetailPageComponent implements OnInit {
    activeTabIndex = signal(0);
    
    private kardexRepo = inject(KardexRepository);
    private alertService = inject(AlertService);
    kardexConsolidado = signal<KardexConsolidado[]>([]);
    loadingKardex = signal<boolean>(false);
    showHelpGuide = signal<boolean>(false);

    downloadConvenioFisico(): void {
        const c = this.stateService.convenio();
        const num = c ? this.formatConvenioNumber(c) : '';
        this.alertService.show(
            'Descarga de Convenio',
            `La descarga del convenio físico original para el convenio ${num} estará disponible próximamente en línea.`,
            'info'
        );
    }

    downloadKardexResumen(): void {
        const c = this.stateService.convenio();
        const num = c ? this.formatConvenioNumber(c) : '';
        this.alertService.show(
            'Exportar Kardex',
            `La exportación del resumen contable de Kardex para el convenio ${num} estará disponible próximamente.`,
            'info'
        );
    }

    downloadReporteProgramacion(): void {
        const c = this.stateService.convenio();
        const num = c ? this.formatConvenioNumber(c) : '';
        this.alertService.show(
            'Exportar Programación',
            `La exportación del reporte de programación de 36 meses para el convenio ${num} estará disponible próximamente.`,
            'info'
        );
    }

    private route = inject(ActivatedRoute);
    private router = inject(Router);
    public stateService = inject(ConvenioStateService);

    constructor() {
        effect(() => {
            const convenio = this.stateService.convenio();
            if (convenio) {
                const tab = this.route.snapshot.queryParamMap.get('tab');
                if (tab) {
                    this.setTabIndexByTab(tab);
                }
            }
        });
    }

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.loadConvenio(Number(id));
        }

        this.route.queryParamMap.subscribe(params => {
            const tab = params.get('tab');
            if (tab) {
                this.setTabIndexByTab(tab);
            }
        });
    }

    loadConvenio(id: number): void {
        this.stateService.refresh(id);
    }

    loadKardexConsolidado(postulanteId: number): void {
        this.loadingKardex.set(true);
        this.kardexRepo.getConsolidado(postulanteId).subscribe({
            next: (data) => {
                this.kardexConsolidado.set(data);
                this.loadingKardex.set(false);
            },
            error: (err) => {
                // Error handled by AlertService or removed
                this.loadingKardex.set(false);
            }
        });
    }

    setActiveTab(index: number): void {
        if (index > 1 && !this.stateService.isProgramacionCompleta()) {
            return;
        }
        this.activeTabIndex.set(index);
        if (index === 5) {
            const convenio = this.stateService.convenio();
            if (convenio) {
                this.loadKardexConsolidado(convenio.id);
            }
        }
    }

    setTabIndexByTab(tab: string): void {
        const isProgComplete = this.stateService.isProgramacionCompleta();
        switch (tab) {
            case 'ficha': this.activeTabIndex.set(0); break;
            case 'programacion': this.activeTabIndex.set(1); break;
            case 'no-objeciones': this.activeTabIndex.set(isProgComplete ? 2 : 1); break;
            case 'desembolsos': this.activeTabIndex.set(isProgComplete ? 3 : 1); break;
            case 'rendiciones': this.activeTabIndex.set(isProgComplete ? 4 : 1); break;
            case 'auditoria': this.activeTabIndex.set(isProgComplete ? 5 : 1); break;
            case 'kardex': {
                if (isProgComplete) {
                    this.activeTabIndex.set(5);
                    const id = this.route.snapshot.paramMap.get('id');
                    if (id) {
                        this.loadKardexConsolidado(Number(id));
                    }
                } else {
                    this.activeTabIndex.set(1);
                }
                break;
            }
        }
    }

    goBack(): void {
        this.router.navigate(['/main/convenios']);
    }

    formatCurrency(value?: number): string {
        if (value === undefined) return '-';
        return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value);
    }

    formatConvenioNumber(convenio?: Convenio): string {
        if (!convenio || !convenio.numeroConvenio) return '-';
        if (convenio.numeroConvenio.includes('-ST')) {
            return convenio.numeroConvenio;
        }
        const padded = convenio.numeroConvenio.toString().padStart(4, '0');
        const year = convenio.fechaInicio ? new Date(convenio.fechaInicio).getFullYear() : 'XXXX';
        return `${padded}-${year}-ST`;
    }

    formatDate(date?: string): string {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('es-PE');
    }

    calculateExecutionPercentage(efectivizado: number, programado: number): number {
        if (!programado || programado <= 0) return 0;
        const percentage = (efectivizado / programado) * 100;
        return Math.min(Math.round(percentage), 100);
    }
}

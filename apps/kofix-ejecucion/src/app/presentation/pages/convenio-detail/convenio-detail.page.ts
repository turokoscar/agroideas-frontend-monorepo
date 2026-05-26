import { UIButtonComponent, UiKpiComponent, UiMapComponent } from '@agroideas/ui';
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { GetConvenioByIdUseCase } from '../../../domain/usecases/get-convenio-by-id.usecase';
import { Convenio } from '../../../domain/models/convenio.model';
import { ConvenioStateService } from '../../../shared/services/convenio-state.service';
import { KardexRepository } from '../../../domain/repositories/kardex.repository';
import { KardexConsolidado } from '../../../domain/models/kardex.model';

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
    templateUrl: './convenio-detail.page.html'
})
export class ConvenioDetailPageComponent implements OnInit {
    activeTabIndex = 0;
    
    private kardexRepo = inject(KardexRepository);
    kardexConsolidado = signal<KardexConsolidado[]>([]);
    loadingKardex = signal<boolean>(false);
    showHelpGuide = signal<boolean>(false);

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        public stateService: ConvenioStateService
    ) { }

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
                console.error('Error al cargar consolidado de Kardex:', err);
                this.loadingKardex.set(false);
            }
        });
    }

    setActiveTab(index: number): void {
        this.activeTabIndex = index;
        if (index === 5) {
            const convenio = this.stateService.convenio();
            if (convenio) {
                this.loadKardexConsolidado(convenio.id);
            }
        }
    }

    setTabIndexByTab(tab: string): void {
        switch (tab) {
            case 'ficha': this.activeTabIndex = 0; break;
            case 'programacion': this.activeTabIndex = 1; break;
            case 'no-objeciones': this.activeTabIndex = 2; break;
            case 'desembolsos': this.activeTabIndex = 3; break;
            case 'rendiciones': this.activeTabIndex = 4; break;
            case 'auditoria': this.activeTabIndex = 5; break;
            case 'kardex': {
                this.activeTabIndex = 5;
                const id = this.route.snapshot.paramMap.get('id');
                if (id) {
                    this.loadKardexConsolidado(Number(id));
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

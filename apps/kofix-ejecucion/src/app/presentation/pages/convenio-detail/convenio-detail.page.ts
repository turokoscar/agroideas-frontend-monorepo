import { UIButtonComponent, UiKpiComponent } from '@agroideas/ui';
import { formatConvenioNumber, formatCurrency } from '@agroideas/utils';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Convenio } from '../../../domain/models/convenio.model';
import { ConvenioStateService } from '../../../shared/services/convenio-state.service';
import { AlertService } from '@agroideas/feedback';
import { ConvenioFichaTecnicaTabComponent } from '../../components/convenio-ficha-tecnica-tab/convenio-ficha-tecnica-tab.component';

/**
 * Ficha técnica de solo lectura de un convenio (ADR-019 Fase 3): Programación
 * (`/main/programacion-vigente/:id`) y Ejecución (`/main/ejecucion/:id`) viven ahora en rutas
 * propias, no como pestañas de esta página. "Continuar →" decide a cuál de las dos llevar al
 * usuario según el estado real del convenio, para que no tenga que saberlo de antemano.
 */
@Component({
    selector: 'app-convenio-detail-page',
    standalone: true,
    imports: [CommonModule, UiKpiComponent, UIButtonComponent, ConvenioFichaTecnicaTabComponent],
    templateUrl: './convenio-detail.page.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConvenioDetailPageComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private alertService = inject(AlertService);
    public stateService = inject(ConvenioStateService);

    readonly continuarLabel = computed(() =>
        this.stateService.isProgramacionCompleta() ? 'Ir a Ejecución' : 'Continuar Programación'
    );

    readonly continuarIcon = computed(() =>
        this.stateService.isProgramacionCompleta() ? 'account_balance_wallet' : 'calendar_month'
    );

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.stateService.refresh(Number(id));
        }
    }

    continuar(): void {
        const convenio = this.stateService.convenio();
        if (!convenio) return;

        if (this.stateService.isProgramacionCompleta()) {
            this.router.navigate(['/main/ejecucion', convenio.id]);
        } else {
            this.router.navigate(['/main/programacion-vigente', convenio.id]);
        }
    }

    downloadConvenioFisico(): void {
        const c = this.stateService.convenio();
        const num = c ? this.formatConvenioNumber(c) : '';
        this.alertService.show(
            'Descarga de Convenio',
            `La descarga del convenio físico original para el convenio ${num} estará disponible próximamente en línea.`,
            'info'
        );
    }

    goBack(): void {
        this.router.navigate(['/main/convenios']);
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

import { UIButtonComponent } from '@agroideas/ui';
import { formatConvenioNumber } from '@agroideas/utils';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { GetConvenioByIdUseCase } from '../../../domain/usecases/get-convenio-by-id.usecase';
import { Convenio } from '../../../domain/models/convenio.model';
import { ProgramacionItemsComponent } from '../../components/programacion-items/programacion-items.component';

/**
 * Espacio de trabajo dedicado de Programación (ADR-019 Fase 3), fuera del tab-bar de
 * `ConvenioDetailPageComponent`. Envuelve `ProgramacionItemsComponent` sin cambios internos.
 */
@Component({
    selector: 'app-programacion-vigente-detail-page',
    standalone: true,
    imports: [CommonModule, UIButtonComponent, ProgramacionItemsComponent],
    templateUrl: './programacion-vigente-detail.page.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProgramacionVigenteDetailPageComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private getConvenioByIdUseCase = inject(GetConvenioByIdUseCase);

    convenio = signal<Convenio | null>(null);

    ngOnInit(): void {
        const id = Number(this.route.snapshot.paramMap.get('id'));
        if (!id) return;

        this.getConvenioByIdUseCase.execute(id).subscribe(c => this.convenio.set(c));
    }

    goBack(): void {
        const c = this.convenio();
        this.router.navigate(['/main/convenios', c?.id ?? '']);
    }

    formatConvenioNumber(): string {
        const c = this.convenio();
        if (!c) return '-';
        return formatConvenioNumber(c.numeroConvenio, c.fechaInicio);
    }
}

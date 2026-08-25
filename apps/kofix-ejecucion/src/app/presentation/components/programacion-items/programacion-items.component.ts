import { StatusType, TableColumn, UIButtonComponent, UiDataTableComponent, UiStatusPillComponent } from '@agroideas/ui';
import { ChangeDetectionStrategy, Component, Input, OnInit, inject, signal, input, Output, EventEmitter, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProgramacionRepository, ProgramacionItemsResponse } from '../../../domain/repositories/programacion.repository';
import { ProgramacionBloqueoItem, ProgramacionItem } from '../../../domain/models/programacion.model';
import { ProgramacionCronogramaModalComponent } from '../programacion-cronograma-modal/programacion-cronograma-modal.component';
import { ConvenioStateService } from '../../../shared/services/convenio-state.service';

@Component({
    selector: 'app-programacion-items',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, UiDataTableComponent, UiStatusPillComponent, ProgramacionCronogramaModalComponent, UIButtonComponent],
    templateUrl: './programacion-items.component.html',
    styleUrls: ['./programacion-items.component.sass']
})
export class ProgramacionItemsComponent implements OnInit {
    convenioId = input.required<number>();
    fechaInicio = input.required<string>();
    fechaFin = input.required<string>();
    readOnly = input<boolean>(false);

    private repo = inject(ProgramacionRepository);
    private stateService = inject(ConvenioStateService);

    items = signal<ProgramacionItem[]>([]);
    totalRecords = signal(0);
    loading = signal(false);
    selectedItem = signal<ProgramacionItem | null>(null);
    pageSize = signal(10);
    currentPage = signal(1);

    private bloqueoMap = signal<Map<number, ProgramacionBloqueoItem>>(new Map());
    selectedItemBloqueo = computed(() => {
        const item = this.selectedItem();
        return item ? this.bloqueoMap().get(item.id) : undefined;
    });

    columns: TableColumn[] = [
        { field: 'orden', header: 'Código', width: '70px', align: 'center' },
        { field: 'descripcion', header: 'Descripción' },
        { field: 'tipo', header: 'Categoría', width: '100px' },
        { field: 'unidadMedida', header: 'U. Medida', width: '80px', align: 'center' },
        { field: 'metaAprobada', header: 'Meta Física Total', type: 'number', align: 'center', width: '120px' },
        { field: 'montoAprobado', header: 'Meta Financiera Total', type: 'currency', align: 'right', width: '150px' },
        { field: 'metaProgramada', header: 'Física Prog.', type: 'number', align: 'center', width: '100px' },
        { field: 'montoProgramado', header: 'Financiera Prog.', type: 'currency', align: 'right', width: '140px' },
        { field: 'alerta', header: 'Alerta', type: 'custom', align: 'center', width: '120px' }
    ];

    ngOnInit(): void {
        this.loadItems(this.currentPage(), this.pageSize());
        this.loadEstadoBloqueo();
    }

    loadItems(page: number, pageSize: number): void {
        this.loading.set(true);
        this.repo.getByPostulante(this.convenioId(), page, pageSize).subscribe({
            next: (res: ProgramacionItemsResponse) => {
                this.items.set(res.items);
                this.totalRecords.set(res.total);
                this.loading.set(false);
            },
            error: (e) => {
                // Error handled by AlertService or removed
                this.loading.set(false);
            }
        });
    }

    loadEstadoBloqueo(): void {
        this.repo.getEstadoBloqueo(this.convenioId()).subscribe({
            next: (res) => {
                this.bloqueoMap.set(new Map(res.items.map(i => [i.itemMlId, i])));
            },
            error: () => {
                // Sin estado de bloqueo, se asume sin restricciones adicionales
            }
        });
    }

    getBloqueoInfo(item: ProgramacionItem): ProgramacionBloqueoItem | undefined {
        return this.bloqueoMap().get(item.id);
    }

    isBloqueado(item: ProgramacionItem): boolean {
        return this.getBloqueoInfo(item)?.bloqueado ?? false;
    }

    onPageChange(event: any): void {
        this.currentPage.set((event.first / event.rows) + 1);
        this.loadItems(this.currentPage(), this.pageSize());
    }

    openCronograma(item: ProgramacionItem): void {
        this.selectedItem.set(item);
    }

    onSaved(): void {
        this.loadItems(this.currentPage(), this.pageSize());
        this.loadEstadoBloqueo();
        // Refrescar los tiles de la ficha del convenio
        this.stateService.refresh(this.convenioId());
    }

    getAlertaStatus(item: ProgramacionItem): StatusType {
        if (this.isBloqueado(item)) {
            return 'Crítica';
        }

        const montoProg = item.montoProgramado ?? 0;
        const montoAprob = item.montoAprobado ?? 0;

        if (montoProg === 0) {
            return 'Crítica';
        }
        if (montoProg >= montoAprob) {
            return 'Activo';
        }
        return 'Pendiente';
    }

    getAlertaLabel(item: ProgramacionItem): string {
        if (this.isBloqueado(item)) {
            return 'Bloqueado';
        }

        const montoProg = item.montoProgramado ?? 0;
        const montoAprob = item.montoAprobado ?? 0;

        if (montoProg === 0) {
            return 'Sin Programar';
        }
        if (montoProg >= montoAprob) {
            return 'Completo';
        }
        return 'Pendiente';
    }
}

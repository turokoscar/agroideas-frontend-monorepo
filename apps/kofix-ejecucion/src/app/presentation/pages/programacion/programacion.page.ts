import { StatusType, TableColumn, UIButtonComponent, UiDataTableComponent, UiFilterBarComponent, UiStatusPillComponent } from '@agroideas/ui';
import { Component, signal, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GetProgramacionResumenUseCase } from '../../../domain/usecases/programacion/get-programacion-resumen.usecase';
import { ProgramacionResumen } from '../../../domain/models/programacion.model';

interface LazyLoadEvent {
    first?: number;
    rows?: number;
}

@Component({
    selector: 'app-programacion-page',
    standalone: true,
    imports: [CommonModule, FormsModule, UiDataTableComponent, UiFilterBarComponent, UiStatusPillComponent, UIButtonComponent],
    templateUrl: './programacion.page.html',
    styleUrls: ['./programacion.page.sass']
})
export class ProgramacionPageComponent {
    @Input() convenio: any;

    private getProgramacionResumenUseCase = inject(GetProgramacionResumenUseCase);
    private router = inject(Router);

    Math = Math;

    programaciones = signal<ProgramacionResumen[]>([]);
    loading = signal(false);
    totalRecords = signal(0);
    pageSize = 10;

    search = '';
    estadoFilter = '';

    columns: TableColumn[] = [
        { field: 'numeroConvenio', header: 'N° Convenio', width: '120px' },
        { field: 'razonSocial', header: 'Organización', type: 'custom' },
        { field: 'estado', header: 'Estado', type: 'custom', align: 'center', width: '120px' },
        { field: 'montoAprobado', header: 'Monto Aprobado', type: 'currency', align: 'right', width: '140px' },
        { field: 'montoProgramado', header: 'Monto Programado', type: 'currency', align: 'right', width: '145px' },
        { field: 'porcentajeProgramado', header: '% Programado', type: 'custom', align: 'right', width: '160px' },
    ];

    loadData(event: LazyLoadEvent): void {
        this.loading.set(true);
        const page = event.first ? Math.floor(event.first / (event.rows ?? this.pageSize)) + 1 : 1;
        const size = event.rows ?? this.pageSize;

        this.getProgramacionResumenUseCase.execute(page, size, this.search, this.estadoFilter).subscribe({
            next: (res: { items: ProgramacionResumen[]; total: number }) => {
                this.programaciones.set(res.items);
                this.totalRecords.set(res.total);
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
            }
        });
    }

    onSearch(): void {
        this.loadData({ first: 0, rows: this.pageSize } as LazyLoadEvent);
    }

    formatConvenioNumber(row: ProgramacionResumen): string {
        return row.numeroConvenio || '----';
    }

    goToDetail(convenioId: number): void {
        this.router.navigate(['/main/convenios', convenioId], {
            queryParams: { tab: 'programacion' }
        });
    }

    getNumeroConvenioDisplay(row: ProgramacionResumen): string {
        return row.numeroConvenio || '---';
    }

    getStatusType(estado: string): StatusType {
        const map: Record<string, StatusType> = {
            'VIGENTE': 'Activo',
            'POR_INICIAR': 'Pendiente',
            'FINALIZADO': 'Finalizado',
            'SUSPENDIDO': 'Suspendido'
        };
        return map[estado] ?? 'Finalizado';
    }

    getStatusLabel(estado: string): string {
        const map: Record<string, string> = {
            'VIGENTE': 'Activo',
            'POR_INICIAR': 'Por Iniciar',
            'FINALIZADO': 'Finalizado',
            'SUSPENDIDO': 'Suspendido'
        };
        return map[estado] ?? estado;
    }
}
import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GetAsignadosUseCase } from '../../../domain/usecases/get-asignados.usecase';
import { GetTodosConveniosUseCase } from '../../../domain/usecases/get-todos-convenios.usecase';
import { PermissionService } from '../../../shared/services/permission.service';
import { PERMISSIONS } from '../../../shared/utils/permissions';
import { UiDataTableComponent, TableColumn } from '../../../shared/components/ui-data-table/ui-data-table.component';
import { UiFilterBarComponent } from '../../../shared/components/ui-filter-bar/ui-filter-bar.component';
import { UiStatusPillComponent, StatusType } from '../../../shared/components/ui-status-pill/ui-status-pill.component';
import { UIButtonComponent } from '../../../shared/components/ui-button/ui-button.component';
import { Convenio } from '../../../domain/models/convenio.model';

@Component({
    selector: 'app-convenio-list-page',
    standalone: true,
    imports: [CommonModule, FormsModule, UiDataTableComponent, UiFilterBarComponent, UiStatusPillComponent, UIButtonComponent],
    templateUrl: './convenio-list.page.html',
    styleUrls: ['./convenio-list.page.sass']
})
export class ConvenioListPageComponent implements OnInit {
    private permissionService = inject(PermissionService);
    private getAsignadosUseCase = inject(GetAsignadosUseCase);
    private getTodosConveniosUseCase = inject(GetTodosConveniosUseCase);
    private router = inject(Router);

    convenios = signal<Convenio[]>([]);
    totalRecords = signal<number>(0);
    loading = signal<boolean>(false);
    search = '';
    estadoFilter = '';
    pageSize = 10;

    columns: TableColumn[] = [
        { field: 'numeroConvenio', header: 'N° Convenio', width: '120px' },
        { field: 'razonSocial', header: 'Organización', type: 'custom' },
        { field: 'region', header: 'Región', width: '130px' },
        { field: 'montoAprobado', header: 'Monto Aprobado', type: 'currency', align: 'right', width: '145px' },
        { field: 'montoProgramado', header: 'Programación', type: 'currency', align: 'right', width: '130px' },
        { field: 'montoEjecutado', header: 'Ejecución', type: 'currency', align: 'right', width: '130px' },
        { field: 'saldoPorEjecutar', header: 'Saldo', type: 'currency', align: 'right', width: '130px' },
        { field: 'estado', header: 'Estado', type: 'custom', align: 'center', width: '110px' }
    ];

    ngOnInit(): void {
        this.loadData({ first: 0, rows: this.pageSize });
    }

    loadData(event?: any): void {
        setTimeout(() => this.loading.set(true));
        const page = event ? Math.floor(event.first / event.rows) + 1 : 1;
        const rows = event?.rows || this.pageSize;

        const useCase = this.permissionService.hasPermission(PERMISSIONS.VER_TODOS_CONVENIOS)
            ? this.getTodosConveniosUseCase
            : this.getAsignadosUseCase;

        useCase.execute(page, rows, this.search).subscribe({
            next: (res) => {
                let datos = res.datos;

                if (this.estadoFilter) {
                    datos = datos.filter((c: Convenio) => c.estado === this.estadoFilter);
                }

                this.convenios.set(datos);
                this.totalRecords.set(res.total);
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
            }
        });
    }

    onSearch(): void {
        this.loadData({ first: 0, rows: this.pageSize });
    }

    goToDetail(id: number): void {
        this.router.navigate(['/main/convenios', id]);
    }

    goToProgramacion(id: number): void {
        this.router.navigate(['/main/convenios', id], { queryParams: { tab: 'programacion' } });
    }

    goToKardex(id: number): void {
        this.router.navigate(['/main/convenios', id], { queryParams: { tab: 'kardex' } });
    }

    formatConvenioNumber(convenio: Convenio): string {
        if (!convenio.numeroConvenio) return '-';
        const padded = convenio.numeroConvenio.toString().padStart(4, '0');
        const year = convenio.fechaInicio ? new Date(convenio.fechaInicio).getFullYear() : '----';
        return `${padded}-${year}-ST`;
    }

    getSaldo(convenio: Convenio): number {
        return convenio.saldoPorEjecutar ?? (convenio.montoAprobado - convenio.montoEjecutado);
    }

    getRiesgo(convenio: Convenio): 'success' | 'warning' | 'danger' {
        const saldo = this.getSaldo(convenio);
        const porcentajeSaldo = saldo / convenio.montoAprobado;

        if (porcentajeSaldo > 0.5) return 'success';
        if (porcentajeSaldo > 0.15) return 'warning';
        return 'danger';
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
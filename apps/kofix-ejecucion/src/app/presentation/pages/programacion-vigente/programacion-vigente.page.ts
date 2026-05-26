import { StatusType, TableColumn, UIButtonComponent, UiDataTableComponent, UiFilterBarComponent, UiStatusPillComponent } from '@agroideas/ui';
import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GetVigenteConveniosUseCase } from '../../../domain/usecases/get-vigente-convenios.usecase';

interface LazyLoadEvent {
    first?: number;
    rows?: number;
}

@Component({
    selector: 'app-programacion-vigente-page',
    standalone: true,
    imports: [CommonModule, FormsModule, UiDataTableComponent, UiFilterBarComponent, UiStatusPillComponent, UIButtonComponent],
    templateUrl: './programacion-vigente.page.html',
    styleUrls: ['./programacion-vigente.page.sass']
})
export class ProgramacionVigentePageComponent implements OnInit {
    private getVigenteConveniosUseCase = inject(GetVigenteConveniosUseCase);
    private router = inject(Router);

    Math = Math;

    convenios = signal<any[]>([]);
    loading = signal(false);
    totalRecords = signal(0);
    pageSize = 10;

    search = '';

    columns: TableColumn[] = [
        { field: 'numeroConvenio', header: 'N° Convenio', width: '120px' },
        { field: 'razonSocial', header: 'Organización', type: 'custom' },
        { field: 'estado', header: 'Estado', type: 'custom', align: 'center', width: '130px' },
        { field: 'montoAprobado', header: 'Monto Aprobado', type: 'currency', align: 'right', width: '145px' },
        { field: 'programacionAcumulada', header: 'Total Programado', type: 'currency', align: 'right', width: '145px' },
        { field: 'porcentajeProgramado', header: '% Programado', type: 'custom', align: 'right', width: '160px' }
    ];

    ngOnInit(): void {
        this.loadData({ first: 0, rows: this.pageSize });
    }

    loadData(event: LazyLoadEvent): void {
        this.loading.set(true);
        const page = event.first ? Math.floor(event.first / (event.rows ?? this.pageSize)) + 1 : 1;
        const size = event.rows ?? this.pageSize;

        this.getVigenteConveniosUseCase.execute(page, size, this.search).subscribe({
            next: (res: { datos: any[], total: number }) => {
                this.convenios.set(res.datos);
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

    getPorcentajeProgramado(item: any): number {
        const monto = item.montoAprobado || item.aporteProgramadoAgroideas || 0;
        const prog = item.programacionAcumulada || 0;
        if (monto <= 0) return 0;
        return Math.min((prog / monto) * 100, 100);
    }

    getProgressLevel(item: any): string {
        const pct = this.getPorcentajeProgramado(item);
        if (pct >= 100) return 'full';
        if (pct >= 50) return 'mid';
        return 'low';
    }

    getStatusType(item: any): StatusType {
        const pct = this.getPorcentajeProgramado(item);
        if (pct >= 100) return 'Activo';
        if (pct >= 50) return 'Media';
        if (pct > 0) return 'Pendiente';
        return 'Crítica';
    }

    getStatusLabel(item: any): string {
        const pct = this.getPorcentajeProgramado(item);
        if (pct >= 100) return 'Programado';
        if (pct >= 50) return 'En proceso';
        if (pct > 0) return 'En proceso';
        return 'No programado';
    }

    goToProgramacion(item: any): void {
        this.router.navigate(['/main/convenios', item.id], {
            queryParams: { tab: 'programacion' }
        });
    }
}
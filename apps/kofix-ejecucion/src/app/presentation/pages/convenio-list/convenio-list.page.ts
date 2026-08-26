import { PermissionService } from '@agroideas/security';
import { PERMISSIONS } from '@agroideas/utils';
import { StatusType, TableColumn, UIButtonComponent, UiDataTableComponent, UiFilterBarComponent, UiProgressBarComponent, UiStatusPillComponent } from '@agroideas/ui';
import { Component, OnInit, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Convenio } from '../../../domain/models/convenio.model';
import { AlertService } from '@agroideas/feedback';
import { ConvenioRepository } from '../../../domain/repositories/convenio.repository';
import { finalize } from 'rxjs/operators';

@Component({
    selector: 'app-convenio-list-page',
    standalone: true,
    imports: [CommonModule, FormsModule, UiDataTableComponent, UiFilterBarComponent, UiProgressBarComponent, UiStatusPillComponent, UIButtonComponent],
    templateUrl: './convenio-list.page.html',
    styleUrls: ['./convenio-list.page.sass'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConvenioListPageComponent implements OnInit {
    private permissionService = inject(PermissionService);
    private convenioRepo = inject(ConvenioRepository);
    private alertService = inject(AlertService);
    private router = inject(Router);

    convenios = signal<Convenio[]>([]);
    totalRecords = signal<number>(0);
    loading = signal<boolean>(false);
    search = signal('');
    estadoFilter = signal('');
    pageSize = signal(10);
    readonly rowsOptions = [5, 10, 20, 50, 100];

    columns: TableColumn[] = [
        { field: 'numeroConvenio', header: 'N° Convenio', width: '120px' },
        { field: 'razonSocial', header: 'Organización', type: 'custom' },
        { field: 'region', header: 'Región', width: '130px' },
        { field: 'vigencia', header: 'Vigencia', type: 'custom', width: '160px' },
        { field: 'montoAprobado', header: 'Monto Aprobado', type: 'currency', align: 'right', width: '145px' },
        { field: 'montoEjecutado', header: 'Ejecutado', type: 'custom', width: '160px' },
        { field: 'estado', header: 'Estado', type: 'custom', align: 'center', width: '110px' }
    ];

    ngOnInit(): void {
        this.loadData({ first: 0, rows: this.pageSize() });
    }

    loadData(event?: any): void {
        this.loading.set(true);
        const page = event ? Math.floor(event.first / event.rows) + 1 : 1;
        const rows = event?.rows || this.pageSize();

        const obs$ = this.permissionService.hasPermission(PERMISSIONS.VER_TODOS_CONVENIOS)
            ? this.convenioRepo.getTodos(page, rows, this.search())
            : this.convenioRepo.getAsignados(page, rows, this.search());

        obs$.pipe(finalize(() => this.loading.set(false))).subscribe({
            next: (res) => {
                let datos = res.datos;

                if (this.estadoFilter()) {
                    datos = datos.filter((c: Convenio) => c.estado === this.estadoFilter());
                }

                this.convenios.set(datos);
                this.totalRecords.set(res.total);
            },
            error: () => {}
        });
    }

    onSearch(): void {
        this.loadData({ first: 0, rows: this.pageSize() });
    }

    onRowsChange(rows: number): void {
        this.pageSize.set(rows);
    }

    goToDetail(id: number): void {
        this.router.navigate(['/main/convenios', id]);
    }

    /**
     * ADR-019 Fase 3: decide a dónde llevar al usuario sin que tenga que saber en qué etapa
     * está el convenio — Programación Vigente si aún no completó su programación, Ejecución si ya la completó.
     */
    continuar(convenio: Convenio): void {
        if (this.isProgramacionCompleta(convenio)) {
            this.router.navigate(['/main/ejecucion', convenio.id]);
        } else {
            this.router.navigate(['/main/programacion-vigente', convenio.id]);
        }
    }

    isProgramacionCompleta(convenio: Convenio): boolean {
        if (!convenio.montoAprobado || convenio.montoAprobado <= 0) return false;
        return Math.round((convenio.programacionAcumulada / convenio.montoAprobado) * 100) >= 100;
    }

    continuarLabel(convenio: Convenio): string {
        return this.isProgramacionCompleta(convenio) ? 'Ir a Ejecución' : 'Continuar Programación';
    }

    continuarIcon(convenio: Convenio): string {
        return this.isProgramacionCompleta(convenio) ? 'account_balance_wallet' : 'calendar_month';
    }

    downloadConvenioFisico(id: number, numero: string): void {
        this.alertService.show(
            'Descarga de Convenio',
            `La descarga del convenio físico original para el convenio ${numero} estará disponible próximamente en línea.`,
            'info'
        );
    }

    formatConvenioNumber(convenio: Convenio): string {
        if (!convenio.numeroConvenio) return '-';
        if (convenio.numeroConvenio.includes('-ST')) {
            return convenio.numeroConvenio;
        }
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

    getSemaphoreClass(estado: string): string {
        const map: Record<string, string> = {
            'VIGENTE': 'semaforo--green',
            'POR_INICIAR': 'semaforo--yellow',
            'FINALIZADO': 'semaforo--red',
            'SUSPENDIDO': 'semaforo--gray'
        };
        return map[estado] ?? 'semaforo--gray';
    }

    formatDate(date: string): string {
        if (!date) return '-';
        const d = new Date(date);
        return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    getPorcentajeEjecucion(convenio: Convenio): number {
        if (!convenio.montoAprobado || convenio.montoAprobado <= 0) return 0;
        return Math.round((convenio.montoEjecutado / convenio.montoAprobado) * 100);
    }
}
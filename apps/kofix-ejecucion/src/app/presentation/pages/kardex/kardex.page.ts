import { StatusType, TableColumn, UIButtonComponent, UiDataTableComponent, UiFilterBarComponent, UiKpiComponent, UiStatusPillComponent } from '@agroideas/ui';
import { PERMISSIONS, formatCurrency } from '@agroideas/utils';
import { AlertService } from '@agroideas/feedback';
import { PermissionService } from '@agroideas/security';
import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KardexRepository } from '../../../domain/repositories/kardex.repository';
import { KardexMovimiento, KardexSummary } from '../../../domain/models/kardex.model';
import { DesembolsoRepository } from '../../../domain/repositories/desembolso.repository';

interface TipoOption {
    label: string;
    value: string;
}

interface EstadoOption {
    label: string;
    value: string;
}

@Component({
    selector: 'app-kardex-page',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        UiDataTableComponent,
        UiKpiComponent,
        UiStatusPillComponent,
        UiFilterBarComponent,
        UIButtonComponent
    ],
    templateUrl: './kardex.page.html',
    styleUrls: ['./kardex.page.sass']
})
export class KardexPageComponent implements OnInit {
    private kardexRepo = inject(KardexRepository);
    private permissionService = inject(PermissionService);
    protected readonly puedeCerrarMes = computed(() => this.permissionService.hasPermission(PERMISSIONS.CIERRE_CONTABLE));
    alertService = inject(AlertService);
    private desembolsoRepo = inject(DesembolsoRepository);

    loading = signal(false);
    totalRecords = signal(0);
    search = signal('');

    movimientos = signal<KardexMovimiento[]>([]);
    summary = signal<KardexSummary>({ totalMovimientos: 0, totalGastos: 0, totalIngresos: 0 });

    ultimoCierre = signal<{ mes: number, anio: number } | null>(null);

    protected readonly proximoMesACerrar = computed(() => {
        const ultimo = this.ultimoCierre();
        if (!ultimo) {
            const currentMes = new Date().getMonth() + 1;
            const currentAnio = new Date().getFullYear();
            return { mes: currentMes, anio: currentAnio };
        }
        let mes = ultimo.mes + 1;
        let anio = ultimo.anio;
        if (mes > 12) {
            mes = 1;
            anio++;
        }
        return { mes, anio };
    });

    tipoOptions: TipoOption[] = [
        { label: 'Todos', value: 'all' },
        { label: 'Desembolso', value: 'DESEMBOLSO' },
        { label: 'Rendición', value: 'RENDICION' },
        { label: 'Devolución', value: 'DEVOLUCION' },
        { label: 'Extorno', value: 'EXTORNO' }
    ];

    estadoOptions: EstadoOption[] = [
        { label: 'Todos', value: 'all' },
        { label: 'Aprobado', value: 'Aprobado' },
        { label: 'Rechazado', value: 'Rechazado' }
    ];

    selectedTipo = 'all';
    selectedEstado = 'all';

    columns: TableColumn[] = [
        { field: 'fecha', header: 'Fecha', width: '110px' },
        { field: 'numeroConvenio', header: 'N° Convenio', width: '120px' },
        { field: 'organizacion', header: 'Organización', width: '180px' },
        { field: 'tipo', header: 'Tipo', type: 'custom', width: '130px' },
        { field: 'documento', header: 'Documento', width: '150px' },
        { field: 'monto', header: 'Monto', type: 'custom', align: 'right', width: '130px' },
        { field: 'estado', header: 'Estado', type: 'custom', align: 'center', width: '120px' }
    ];

    ngOnInit(): void {
        this.loadCierres();
        this.loadData();
    }

    loadCierres(): void {
        this.kardexRepo.getCierres().subscribe({
            next: (data) => {
                if (data && data.length > 0) {
                    const latest = data[0];
                    this.ultimoCierre.set({
                        mes: latest.numMes ?? latest.num_mes ?? latest.mes,
                        anio: latest.numAnio ?? latest.num_anio ?? latest.anio
                    });
                } else {
                    this.ultimoCierre.set(null);
                }
            }
        });
    }

    loadData(event?: any): void {
        const offset = event?.first || 0;
        const limit = event?.rows || 10;

        setTimeout(() => this.loading.set(true));

        this.kardexRepo.getMovimientos(
            this.selectedTipo,
            this.selectedEstado,
            offset,
            limit
        ).subscribe({
            next: (res) => {
                this.movimientos.set(res.items);
                this.totalRecords.set(res.total);
                this.summary.set(res.summary);
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
            }
        });
    }

    onSearch(): void {
        this.loadData();
    }

    formatCurrency(value: number): string {
        return formatCurrency(value);
    }

    getRowClass(movimiento: KardexMovimiento): string {
        if (movimiento.monto > 0) return 'kardex-row-income';
        if (movimiento.monto < 0) return 'kardex-row-expense';
        return 'kardex-row-neutral';
    }

    getMontoClass(movimiento: KardexMovimiento): string {
        if (movimiento.monto > 0) return 'text-success font-bold';
        if (movimiento.monto < 0) return 'text-danger font-bold';
        return '';
    }

    getTipoIcon(tipo: string): string {
        const t = (tipo || '').toUpperCase();
        if (t.includes('DESEMBOLSO')) return 'arrow_upward';
        if (t.includes('RENDIC') || t.includes('DEVOLUC') || t.includes('GASTO') || t.includes('EXTORNO')) return 'arrow_downward';
        return 'remove';
    }

    getTipoClass(tipo: string): string {
        const t = (tipo || '').toUpperCase();
        if (t.includes('DESEMBOLSO')) return 'text-success';
        if (t.includes('RENDIC') || t.includes('DEVOLUC') || t.includes('GASTO') || t.includes('EXTORNO')) return 'text-danger';
        return 'text-muted-foreground';
    }

    getTipoNormalized(tipo: string): string {
        const t = (tipo || '').toUpperCase();
        if (t.includes('DESEMBOLSO')) return 'Desembolso';
        if (t.includes('RENDIC')) return 'Rendición';
        if (t.includes('DEVOLUC')) return 'Devolución';
        if (t.includes('EXTORNO')) return 'Extorno';
        return 'Gasto';
    }

    getEstadoStatus(estado: string): StatusType {
        const map: Record<string, StatusType> = {
            'Aprobado': 'Aprobado',
            'Pendiente': 'Pendiente',
            'Rechazado': 'Rechazado',
            'Activo': 'Activo'
        };
        return map[estado] ?? 'Pendiente';
    }

    ejecutarCierreContable(): void {
        const target = this.proximoMesACerrar();
        const mes = target.mes;
        const anio = target.anio;

        this.alertService.confirm(
            '¿Ejecutar Cierre Contable Mensual?',
            `Esta acción cerrará permanentemente el mes contable de ${mes}/${anio}. No se permitirán modificaciones operativas posteriores.`
        ).then((result: any) => {
            if (result.isConfirmed) {
                this.loading.set(true);
                this.desembolsoRepo.ejecutarCierreContable(mes, anio).subscribe({
                    next: () => {
                        this.loading.set(false);
                        this.alertService.show('Éxito', `Cierre contable ejecutado correctamente para el mes ${mes}/${anio}.`, 'success');
                        this.loadCierres();
                        this.loadData();
                    },
                    error: (err) => {
                        this.loading.set(false);
                        this.alertService.show('Error', err.error?.mensaje || 'No se pudo ejecutar el cierre contable.', 'error');
                    }
                });
            }
        });
    }
}

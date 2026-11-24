import { AlertService } from '@agroideas/feedback';
import { PermissionService } from '@agroideas/security';
import { PERMISSIONS } from '@agroideas/utils';
import { StatusType, TableColumn, UIButtonComponent, UiDataTableComponent, UiFilterBarComponent, UiStatusPillComponent } from '@agroideas/ui';
import { ChangeDetectionStrategy, Component, Input, OnInit, computed, inject, signal, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NoObjecionItemsModalComponent } from '../../components/no-objecion-items-modal/no-objecion-items-modal.component';
import { NoObjecionRebajaModalComponent } from '../../components/no-objecion-rebaja-modal/no-objecion-rebaja-modal.component';
import { EvaluacionResumen } from '../../../domain/models/evaluacion-no-objecion.model';
import { EvaluacionNoObjecionRepository } from '../../../domain/repositories/evaluacion-no-objecion.repository';
import { NoObjecionRepository } from '../../../domain/repositories/no-objecion.repository';
import { NoObjecion } from '../../../domain/models/no-objecion.model';
import { finalize } from 'rxjs/operators';

@Component({
    selector: 'app-no-objecion-page',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        UiDataTableComponent,
        UiFilterBarComponent,
        UiStatusPillComponent,
        NoObjecionItemsModalComponent,
        NoObjecionRebajaModalComponent,
        UIButtonComponent
    ],
    templateUrl: './no-objecion.page.html',
    styleUrls: ['./no-objecion.page.sass'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class NoObjecionPageComponent implements OnInit {
    convenioId = input.required<number>();
    readOnly = input<boolean>(false);

    private noObjecionRepo = inject(NoObjecionRepository);
    private evaluacionRepo = inject(EvaluacionNoObjecionRepository);
    private router = inject(Router);
    private alertService = inject(AlertService);
    private permissionService = inject(PermissionService);

    /** Rebajar / anular saldo exige el mismo permiso que la API (ADR 0012 Fase 4). */
    protected readonly puedeOperarFinanzas = computed(() => this.permissionService.hasPermission(PERMISSIONS.OPERACIONES_FINANCIERAS));

    /** Evaluaciones de proveedores del convenio (API ADR-032 entrega 2). */
    evaluaciones = signal<EvaluacionResumen[]>([]);
    noObjeciones = signal<NoObjecion[]>([]);
    loading = signal(false);
    totalRecords = signal(0);

    // Filtros
    searchTerm = signal('');
    fechaInicio = signal('');
    fechaFin = signal('');

    // Modal de rebaja / anulación del saldo no solicitado (ADR 0012 Fase 4)
    showRebajaModal = signal(false);
    rebajaNoObjecionId = signal<number | undefined>(undefined);

    // Modal ligero de solo lectura (ver ítems)
    showItemsModal = signal(false);
    viewingNoObjecionId = signal<number | undefined>(undefined);

    columns: TableColumn[] = [
        { field: 'numeroDocumento', header: 'N° Documento', type: 'custom', width: '140px' },
        { field: 'tipoDocumentoNombre', header: 'Tipo Doc.', width: '130px' },
        { field: 'fechaDocumento', header: 'Fecha', type: 'date', width: '110px', align: 'center' },
        { field: 'totalMonto', header: 'Adjudicado Vigente', type: 'currency', align: 'right', width: '150px' },
        { field: 'saldoMonto', header: 'Sin Solicitar', type: 'currency', align: 'right', width: '140px' },
        { field: 'estadoAprobacion', header: 'Evaluación', type: 'custom', width: '120px', align: 'center' },
        { field: 'estadoNombre', header: 'Uso', type: 'custom', width: '120px', align: 'center' },
        { field: 'observacion', header: 'Observación' },
    ];

    private statusMap: Record<string, StatusType> = {
        'BORRADOR': 'Pendiente',
        'PENDIENTE': 'Pendiente',
        'APROBADO':  'Aprobado',
        'RECHAZADO': 'Rechazado',
        // Estados que calcula la API (ADR 0012 Fase 4)
        'Registrado': 'Pendiente',
        'En Uso':     'Activo',
        'Utilizado':  'Finalizado',
        'Rebajada':   'Media',
        'Cerrada':    'Cerrado',
    };

    getBadgeStatus(value: string): StatusType {
        return this.statusMap[value] ?? 'Pendiente';
    }

    formatDocNumber(num: string, date: any): string {
        if (!num) return '';
        if (num.includes('-')) return num;
        const cleanNum = parseInt(num, 10);
        if (isNaN(cleanNum)) return num;
        
        const year = date ? new Date(date).getFullYear() : new Date().getFullYear();
        return `${cleanNum.toString().padStart(4, '0')}-${year}`;
    }

    ngOnInit(): void {
        this.loadNoObjeciones();
        this.loadEvaluaciones();
    }

    loadEvaluaciones(): void {
        const id = this.convenioId();
        if (!id) return;
        this.evaluacionRepo.getByPostulante(id).subscribe({ next: e => this.evaluaciones.set(e), error: () => undefined });
    }

    nuevaEvaluacion(): void {
        this.evaluacionRepo.crear(this.convenioId()).subscribe({
            next: id => this.abrirEvaluacion(id),
            error: err => this.alertService.show('Error', err?.error?.mensaje || 'No se pudo crear la evaluación.', 'error')
        });
    }

    abrirEvaluacion(id: number): void {
        this.router.navigate(['/main/ejecucion', this.convenioId(), 'evaluaciones', id]);
    }

    eliminarEvaluacion(id: number): void {
        this.alertService.confirm('¿Eliminar la evaluación?', 'Se perderán los datos ingresados.').then(r => {
            if (!r.isConfirmed) return;
            this.evaluacionRepo.eliminar(id).subscribe({
                next: () => this.loadEvaluaciones(),
                error: err => this.alertService.show('Error', err?.error?.mensaje || 'No se pudo eliminar la evaluación.', 'error')
            });
        });
    }

    applyFilters(): void {
        this.loadNoObjeciones(0, 10);
    }

    loadLazyNoObjeciones(event: any): void {
        this.loadNoObjeciones(event.first, event.rows);
    }

    loadNoObjeciones(offset = 0, limit = 10): void {
        const id = this.convenioId();
        if (!id) return;
        
        this.loading.set(true);
        
        this.noObjecionRepo.getByPostulante(id, offset, limit, this.searchTerm(), this.fechaInicio(), this.fechaFin()).pipe(finalize(() => this.loading.set(false))).subscribe({
            next: (result) => {
                this.noObjeciones.set(result.items);
                this.totalRecords.set(result.total);
            },
            error: () => {}
        });
    }

    /** API ADR-032: aprobar y luego desembolsar. */
    estaAprobada(row: NoObjecion): boolean {
        return row.estadoAprobacion === 'APROBADO';
    }

    /** Evaluación desde la que se gestiona la N.O.; las anteriores al ADR-032 no tienen. */
    evaluacionDe(row: NoObjecion): number | null {
        return this.evaluaciones().find(e => e.noObjecionId === row.id)?.id ?? null;
    }

    /** Rebajar / anular saldo: N.O. aprobada, con permiso OPERACIONES_FINANCIERAS y saldo no solicitado (ADR 0012 Fase 4). */
    puedeRebajar(row: NoObjecion): boolean {
        return this.puedeOperarFinanzas() && this.estaAprobada(row) && (row.saldoMonto || 0) > 0;
    }

    openRebajaModal(row: NoObjecion): void {
        if (!this.puedeRebajar(row)) return;
        this.rebajaNoObjecionId.set(row.id);
        this.showRebajaModal.set(true);
    }

    handleRebajaModalClose(refresh: boolean): void {
        this.showRebajaModal.set(false);
        if (refresh) {
            this.loadNoObjeciones();
        }
    }

    viewNoObjecion(id: number): void {
        this.viewingNoObjecionId.set(id);
        this.showItemsModal.set(true);
    }

    handleItemsModalClose(): void {
        this.showItemsModal.set(false);
    }

    downloadDocument(fileUrl: string, numero?: string): void {
        if (!fileUrl) {
            this.alertService.show('Información', 'Esta No Objeción no tiene un documento adjunto.', 'info');
            return;
        }

        this.noObjecionRepo.downloadFile(fileUrl).subscribe({
            next: (blob) => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${numero || 'documento'}.pdf`.replace(/[\\/:*?"<>|]/g, '-');
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            },
            error: (err) => {
                // Error handled by AlertService or removed
                this.alertService.show('Error', 'No se pudo descargar el archivo del servidor.', 'error');
            }
        });
    }
}

import { AlertService } from '@agroideas/feedback';
import { StatusType, TableColumn, UIButtonComponent, UiDataTableComponent, UiFilterBarComponent, UiStatusPillComponent } from '@agroideas/ui';
import { ChangeDetectionStrategy, Component, Input, OnInit, inject, signal, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NoObjecionModalComponent } from '../../components/no-objecion-modal/no-objecion-modal.component';
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
        NoObjecionModalComponent,
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
    private alertService = inject(AlertService);

    noObjeciones = signal<NoObjecion[]>([]);
    loading = signal(false);
    totalRecords = signal(0);

    // Filtros
    searchTerm = signal('');
    fechaInicio = signal('');
    fechaFin = signal('');

    // Modal
    showModal = signal(false);
    modalMode = signal<'create' | 'edit' | 'view'>('create');
    selectedNoObjecionId = signal<number | undefined>(undefined);

    columns: TableColumn[] = [
        { field: 'numeroDocumento', header: 'N° Documento', type: 'custom', width: '140px' },
        { field: 'tipoDocumentoNombre', header: 'Tipo Doc.', width: '130px' },
        { field: 'fechaDocumento', header: 'Fecha', type: 'date', width: '110px', align: 'center' },
        { field: 'totalMonto', header: 'Total Adjudicado', type: 'currency', align: 'right', width: '150px' },
        { field: 'estadoNombre', header: 'Estado', type: 'custom', width: '120px', align: 'center' },
        { field: 'observacion', header: 'Observación' },
    ];

    private statusMap: Record<string, StatusType> = {
        'PENDIENTE': 'Pendiente',
        'APROBADO':  'Aprobado',
        'RECHAZADO': 'Rechazado',
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

    // Acciones del Modal
    openRegisterModal(): void {
        this.modalMode.set('create');
        this.selectedNoObjecionId.set(undefined);
        this.showModal.set(true);
    }

    editNoObjecion(id: number): void {
        const noObj = this.noObjeciones().find(n => n.id === id);
        if (noObj && (noObj.numSolicitudes || 0) > 0) {
            this.alertService.show('Acción no permitida', 'No se puede modificar una No Objeción que ya tiene desembolsos asociados.', 'warning');
            return;
        }

        this.modalMode.set('edit');
        this.selectedNoObjecionId.set(id);
        this.showModal.set(true);
    }

    viewNoObjecion(id: number): void {
        this.modalMode.set('view');
        this.selectedNoObjecionId.set(id);
        this.showModal.set(true);
    }

    handleModalClose(refresh: boolean): void {
        this.showModal.set(false);
        if (refresh) {
            this.loadNoObjeciones();
        }
    }

    deleteNoObjecion(id: number): void {
        const noObj = this.noObjeciones().find(n => n.id === id);
        if (noObj && (noObj.numSolicitudes || 0) > 0) {
            this.alertService.show('Acción no permitida', 'No se puede eliminar una No Objeción que ya tiene desembolsos asociados.', 'warning');
            return;
        }

        this.alertService.confirm('¿Eliminar No Objeción?', 'Esta acción no se puede deshacer.').then(result => {
            if (result.isConfirmed) {
                this.noObjecionRepo.delete(id).subscribe({
                    next: () => {
                        this.alertService.toast('No Objeción eliminada con éxito.');
                        this.loadNoObjeciones();
                    },
                    error: (err) => {
                        // Error handled by AlertService or removed
                        this.alertService.show('Error', 'No se pudo eliminar el registro.', 'error');
                    }
                });
            }
        });
    }

    downloadDocument(fileUrl: string): void {
        if (!fileUrl) {
            this.alertService.show('Información', 'Esta No Objeción no tiene un documento adjunto.', 'info');
            return;
        }

        this.noObjecionRepo.downloadFile(fileUrl).subscribe({
            next: (blob) => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileUrl.split('/').pop() || 'documento.pdf';
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

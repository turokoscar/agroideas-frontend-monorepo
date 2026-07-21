import { ChangeDetectionStrategy, Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlertService } from '@agroideas/feedback';
import { StatusType, TableColumn, UIButtonComponent, UiDataTableComponent, UiStatusPillComponent, UIModalComponent } from '@agroideas/ui';
import { formatCurrency } from '@agroideas/utils';
import { NoObjecionRepository } from '../../../domain/repositories/no-objecion.repository';
import { finalize } from 'rxjs/operators';

@Component({
    selector: 'app-bandeja-aprobacion-page',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        UiDataTableComponent,
        UiStatusPillComponent,
        UIButtonComponent,
        UIModalComponent
    ],
    providers: [DecimalPipe],
    templateUrl: './bandeja-aprobacion.page.html',
    styleUrls: ['./bandeja-aprobacion.page.sass'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BandejaAprobacionPageComponent implements OnInit {
    private noObjecionRepo = inject(NoObjecionRepository);
    private alertService = inject(AlertService);

    loading = signal(false);
    activeTab = signal<'PENDIENTE' | 'APROBADO' | 'RECHAZADO'>('PENDIENTE');
    items = signal<any[]>([]);
    totalRecords = signal(0);

    // Modal de evaluación
    showEvalModal = signal(false);
    selectedItem = signal<any | null>(null);
    observacionSupervisor = signal('');
    isSubmitting = signal(false);

    columns: TableColumn[] = [
        { field: 'numeroNoObjecion', header: 'N° No Objeción', type: 'custom', width: '130px' },
        { field: 'fecha', header: 'Fecha', type: 'date', width: '110px' },
        { field: 'organizacion', header: 'Organización / RUC', type: 'custom', width: '220px' },
        { field: 'numeroConvenio', header: 'N° Convenio', width: '120px' },
        { field: 'region', header: 'Región', width: '110px' },
        { field: 'especialista', header: 'Especialista', width: '150px' },
        { field: 'montoSolicitado', header: 'Monto Solicitado', type: 'custom', align: 'right', width: '130px' },
        { field: 'acciones', header: 'Acciones', type: 'custom', align: 'center', width: '140px' }
    ];

    ngOnInit(): void {
        this.loadData();
    }

    formatDocNumber(num: string, date: any): string {
        if (!num) return '';
        if (num.includes('-')) return num;
        const cleanNum = parseInt(num, 10);
        if (isNaN(cleanNum)) return num;
        
        const year = date ? new Date(date).getFullYear() : new Date().getFullYear();
        return `${cleanNum.toString().padStart(4, '0')}-${year}`;
    }

    setTab(tab: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO'): void {
        this.activeTab.set(tab);
        this.loadData();
    }

    loadData(event?: any): void {
        const offset = event?.first || 0;
        const limit = event?.rows || 10;

        this.loading.set(true);

        this.noObjecionRepo.getBandejaAprobacion(this.activeTab(), offset, limit).pipe(finalize(() => this.loading.set(false))).subscribe({
            next: (res) => {
                this.items.set(res.items);
                this.totalRecords.set(res.total);
            },
            error: () => {}
        });
    }

    formatCurrency(value: number): string {
        return formatCurrency(value);
    }

    downloadEvidencia(item: any): void {
        if (!item.archivoUrl) {
            this.alertService.show('Información', 'Esta No Objeción no contiene un documento adjunto.', 'info');
            return;
        }

        this.noObjecionRepo.downloadFile(item.archivoUrl).subscribe({
            next: (blob) => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = item.archivoUrl.split('/').pop() || 'no_objecion.pdf';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            },
            error: () => {
                this.alertService.show('Error', 'No se pudo descargar el archivo de sustento.', 'error');
            }
        });
    }

    openEvaluarModal(item: any): void {
        this.selectedItem.set(item);
        this.observacionSupervisor.set('');
        this.showEvalModal.set(true);
    }

    closeEvaluarModal(): void {
        this.showEvalModal.set(false);
        this.selectedItem.set(null);
    }

    procesarEvaluacion(estado: 'APROBADO' | 'RECHAZADO'): void {
        const item = this.selectedItem();
        if (!item) return;

        if (!this.observacionSupervisor().trim()) {
            this.alertService.toast('Debe ingresar un sustento u observación obligatoriamente.', 'warning');
            return;
        }

        const label = estado === 'APROBADO' ? 'aprobar' : 'rechazar';
        this.alertService.confirm(
            `¿Confirmar evaluación?`,
            `¿Está seguro de que desea ${label} la No Objeción N° ${item.numeroNoObjecion}?`
        ).then((result: any) => {
            if (result.isConfirmed) {
                this.isSubmitting.set(true);
                this.noObjecionRepo.evaluar(item.id, estado, this.observacionSupervisor()).subscribe({
                    next: (res: any) => {
                        this.isSubmitting.set(false);
                        this.alertService.show('Éxito', res.mensaje || `No Objeción evaluada correctamente.`, 'success');
                        this.closeEvaluarModal();
                        this.loadData();
                    },
                    error: (err: any) => {
                        this.isSubmitting.set(false);
                        this.alertService.show('Error', err.error?.mensaje || 'No se pudo procesar la evaluación.', 'error');
                    }
                });
            }
        });
    }
}

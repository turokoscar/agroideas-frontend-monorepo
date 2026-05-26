import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UiDataTableComponent, TableColumn } from '../../../shared/components/ui-data-table/ui-data-table.component';
import { UiFilterBarComponent } from '../../../shared/components/ui-filter-bar/ui-filter-bar.component';
import { UiStatusPillComponent, StatusType } from '../../../shared/components/ui-status-pill/ui-status-pill.component';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { UIButtonComponent } from '../../../shared/components/ui-button/ui-button.component';
import { PERMISSIONS } from '../../../shared/utils/permissions';
import { CarteraRepository, Especialista, ReasignarRequest } from '../../../domain/repositories/cartera.repository';
import { CarteraItem } from '../../../domain/models/cartera.model';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-cartera-page',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        UiDataTableComponent,
        UiFilterBarComponent,
        UiStatusPillComponent,
        HasPermissionDirective,
        UIButtonComponent
    ],
    templateUrl: './cartera.page.html',
    styleUrls: ['./cartera.page.sass']
})
export class CarteraPageComponent implements OnInit {
    private carteraRepo = inject(CarteraRepository);
    private router = inject(Router);

    protected readonly permGestionCartera = PERMISSIONS.GESTION_CARTERA;

    Math = Math;

    loading = signal(false);
    cartera = signal<CarteraItem[]>([]);
    totalRecords = signal(0);
    search = signal('');

    especialistas = signal<Especialista[]>([]);
    selectedEspecialistaId = signal<number | null>(null);
    observacion = signal('');
    reasignItem = signal<CarteraItem | null>(null);
    showReasignModal = signal(false);

    columns: TableColumn[] = [
        { field: 'numeroConvenio', header: 'N° Convenio', width: '130px', type: 'custom' },
        { field: 'razonSocial', header: 'Organización' },
        { field: 'asignadoA', header: 'Especialista', width: '160px' },
        { field: 'estadoSituacional', header: 'Estado', type: 'custom', align: 'center', width: '120px' },
        { field: 'saldo', header: 'Saldo', type: 'custom', align: 'right', width: '130px' }
    ];

    ngOnInit(): void {
        this.loadData();
        this.loadEspecialistas();
    }

    loadData(event?: any): void {
        const offset = event?.first || 0;
        const limit = event?.rows || 10;

        setTimeout(() => this.loading.set(true));

        this.carteraRepo.getCartera(
            this.search(),
            offset,
            limit
        ).subscribe({
            next: (res) => {
                this.cartera.set(res.items);
                this.totalRecords.set(res.total);
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
            }
        });
    }

    loadEspecialistas(): void {
        this.carteraRepo.getEspecialistas().subscribe({
            next: (especialistas) => {
                this.especialistas.set(especialistas);
            }
        });
    }

    onSearch(): void {
        this.loadData();
    }

    goToDetail(postulanteId: number): void {
        this.router.navigate(['/main/convenios', postulanteId]);
    }

    abrirReasignar(item: CarteraItem): void {
        this.reasignItem.set(item);
        this.selectedEspecialistaId.set(null);
        this.observacion.set('');
        this.showReasignModal.set(true);
    }

    cerrarReasignar(): void {
        this.showReasignModal.set(false);
        this.reasignItem.set(null);
    }

    confirmarReasignar(): void {
        const item = this.reasignItem();
        const especialistaId = this.selectedEspecialistaId();

        if (!item || !especialistaId) {
            Swal.fire('Error', 'Debe seleccionar un especialista.', 'error');
            return;
        }

        const request: ReasignarRequest = {
            postulanteId: item.postulanteId,
            nuevoEspecialistaId: especialistaId,
            observacion: this.observacion() || undefined
        };

        this.carteraRepo.reasignar(request).subscribe({
            next: (res) => {
                if (res.exitoso) {
                    Swal.fire('Éxito', 'Especialista reasignado correctamente.', 'success');
                    this.cerrarReasignar();
                    this.loadData();
                } else {
                    Swal.fire('Error', res.mensaje || 'No se pudo reasignar.', 'error');
                }
            },
            error: () => {
                Swal.fire('Error', 'Ocurrió un error al reasignar.', 'error');
            }
        });
    }

    formatConvenioNumber(item: CarteraItem): string {
        if (!item.numeroConvenio) return '-';
        const padded = item.numeroConvenio.toString().padStart(4, '0');
        return `${padded}-${item.periodo}-ST`;
    }

    getSaldoColor(item: CarteraItem): string {
        const porcentaje = item.montoAprobado > 0 ? (item.saldo / item.montoAprobado) : 0;
        if (porcentaje <= 0.15) return 'text-red-600';
        if (porcentaje <= 0.50) return 'text-yellow-600';
        return 'text-green-600';
    }

    getEstadoSemaforo(item: CarteraItem): { status: StatusType; text: string } {
        const porcentaje = item.montoAprobado > 0 ? (item.ejecucionAcumulada / item.montoAprobado) : 0;
        if (porcentaje >= 0.90) return { status: 'Activo', text: 'En ejecución' };
        if (porcentaje >= 0.50) return { status: 'Media', text: 'En proceso' };
        if (porcentaje > 0) return { status: 'Pendiente', text: 'Iniciando' };
        return { status: 'Crítica', text: 'Sin ejecutar' };
    }

    getEstadoVariant(estado: string): StatusType {
        const estadoLower = estado?.toLowerCase() || '';
        if (estadoLower.includes('activo') || estadoLower.includes('vigente')) return 'Activo';
        if (estadoLower.includes('suspendido') || estadoLower.includes('paralizado')) return 'Suspendido';
        if (estadoLower.includes('finalizado') || estadoLower.includes('concluido')) return 'Finalizado';
        return 'Media';
    }

    getEstadoText(estado: string): string {
        if (!estado) return 'Sin estado';
        return estado.charAt(0).toUpperCase() + estado.slice(1).toLowerCase();
    }
}
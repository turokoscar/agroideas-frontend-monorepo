import { Component, OnInit, inject, signal, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GetRendicionesByConvenioUseCase } from '../../../domain/usecases/rendicion/get-rendiciones.usecase';
import { Rendicion } from '../../../domain/models/rendicion.model';
import { RendicionModalComponent } from '../../components/rendicion-modal/rendicion-modal.component';
import { UiDataTableComponent, TableColumn } from '../../../shared/components/ui-data-table/ui-data-table.component';
import { UiStatusPillComponent } from '../../../shared/components/ui-status-pill/ui-status-pill.component';
import { UiFilterBarComponent } from '../../../shared/components/ui-filter-bar/ui-filter-bar.component';
import { UIButtonComponent } from '../../../shared/components/ui-button/ui-button.component';
import { FormsModule } from '@angular/forms';
import { DeleteRendicionUseCase } from '../../../domain/usecases/rendicion/delete-rendicion.usecase';
import { CatalogoRepository } from '../../../domain/repositories/catalogo.repository';
import { AlertService } from '../../../shared/services/alert.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-rendicion-page',
  standalone: true,
  imports: [
    CommonModule,
    RendicionModalComponent, 
    UiDataTableComponent, 
    UiStatusPillComponent,
    UiFilterBarComponent,
    FormsModule,
    UIButtonComponent
  ],
  templateUrl: './rendicion.page.html'
})
export class RendicionPageComponent implements OnInit {
  convenioId = input.required<number>();
  readOnly = input<boolean>(false);

  private getRendicionesUseCase = inject(GetRendicionesByConvenioUseCase);
  private deleteRendicionUseCase = inject(DeleteRendicionUseCase);
  private catalogoRepo = inject(CatalogoRepository);
  private alertService = inject(AlertService);

  loading = signal(false);
  rendiciones = signal<Rendicion[]>([]);
  totalRecords = signal(0);
  showModal = signal(false);

  // Pagination and Filters signals
  offset = signal(0);
  limit = signal(10);
  filterNumero = signal<string | undefined>(undefined);
  filterFechaInicio = signal<string | undefined>(undefined);
  filterFechaFin = signal<string | undefined>(undefined);
  filterTipoCp = signal<number | undefined>(undefined);
  tiposCpe = signal<any[]>([]);
  selectedRendicion = signal<Rendicion | null>(null);

  columns: TableColumn[] = [
    { field: 'fechaEmision', header: 'Fecha Emisión', type: 'date', width: '120px' },
    { field: 'numeroSolicitud', header: 'Solicitud Origen', width: '180px' },
    { field: 'tipoCpe', header: 'Tipo Comprobante', width: '200px' },
    { field: 'serieNumero', header: 'Serie-Número', width: '180px' },
    { field: 'total', header: 'Monto Rendido', type: 'custom', width: '150px', align: 'right' },
    { field: 'estado', header: 'Estado', type: 'custom', width: '120px', align: 'center' },
  ];

  ngOnInit(): void {
    this.loadCatalogs();
    this.loadRendiciones();
  }

  loadCatalogs(): void {
    this.catalogoRepo.getByGrupo('SUNAT_CPE').subscribe(data => this.tiposCpe.set(data));
  }

  loadRendiciones(): void {
    const cid = this.convenioId();
    if (!cid) return;

    this.loading.set(true);
    this.getRendicionesUseCase.execute(cid, this.offset(), this.limit(), this.filterTipoCp(), this.filterNumero())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => {
          this.rendiciones.set(res.items);
          this.totalRecords.set(res.total);
        }
      });
  }

  loadLazyRendiciones(event: any): void {
    this.offset.set(event.first || 0);
    this.limit.set(event.rows || 10);
    this.loadRendiciones();
  }

  onSearch(): void {
    this.offset.set(0);
    this.loadRendiciones();
  }

  openModal(): void {
    this.selectedRendicion.set(null);
    this.showModal.set(true);
  }

  editRendicion(item: Rendicion): void {
    this.selectedRendicion.set(item);
    this.showModal.set(true);
  }

  viewRendicion(item: Rendicion): void {
    this.selectedRendicion.set(item);
    this.showModal.set(true);
    // Nota: el modal debe detectar el modo readOnly si se desea restringir dentro de él también
  }

  async deleteRendicion(id: number): Promise<void> {
    const confirmed = await this.alertService.confirm('¿Anular Rendición?', 'Esta acción no se puede deshacer.');
    if (!confirmed.isConfirmed) return;

    this.loading.set(true);
    this.deleteRendicionUseCase.execute(id).pipe(
        finalize(() => this.loading.set(false))
    ).subscribe({
        next: () => {
            this.alertService.toast('Rendición anulada');
            this.loadRendiciones();
        },
        error: (err) => this.alertService.show('Error', err.error?.mensaje || 'No se pudo anular la rendición', 'error')
    });
  }

  onRendicionSuccess(): void {
    this.showModal.set(false);
    this.selectedRendicion.set(null);
    this.loadRendiciones();
  }
}

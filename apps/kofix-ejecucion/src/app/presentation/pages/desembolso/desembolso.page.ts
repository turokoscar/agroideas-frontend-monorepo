import { Component, OnInit, inject, input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GetDesembolsosByConvenioUseCase } from '../../../domain/usecases/desembolso/get-desembolsos.usecase';
import { Desembolso } from '../../../domain/models/desembolso.model';
import { DesembolsoModalComponent } from '../../components/desembolso-modal/desembolso-modal.component';
import { CatalogoRepository } from '../../../domain/repositories/catalogo.repository';
import { CatalogoItem } from '../../../domain/models/catalogo.model';
import { UiDataTableComponent, TableColumn } from '../../../shared/components/ui-data-table/ui-data-table.component';
import { UiFilterBarComponent } from '../../../shared/components/ui-filter-bar/ui-filter-bar.component';
import { UiStatusPillComponent, StatusType } from '../../../shared/components/ui-status-pill/ui-status-pill.component';
import { UIButtonComponent } from '../../../shared/components/ui-button/ui-button.component';
import { AlertService } from '../../../shared/services/alert.service';
import { PermissionService } from '../../../shared/services/permission.service';
import { PERMISSIONS } from '../../../shared/utils/permissions';
import { DesembolsoRepository } from '../../../domain/repositories/desembolso.repository';

@Component({
  selector: 'app-desembolso-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    UiDataTableComponent,
    UiFilterBarComponent,
    UiStatusPillComponent,
    DesembolsoModalComponent,
    UIButtonComponent
  ],
  templateUrl: './desembolso.page.html',
  styleUrls: ['./desembolso.page.sass']
})
export class DesembolsoPageComponent implements OnInit {
  convenioId = input.required<number>();
  readOnly = input<boolean>(false);

  desembolsos = signal<Desembolso[]>([]);
  loading = signal<boolean>(false);
  totalRecords = signal<number>(0);
  showModal = signal<boolean>(false);

  // Filtros
  filterNumero = signal<string | undefined>(undefined);
  filterTipoPago = signal<number | undefined>(undefined);
  filterFechaInicio = signal<string | undefined>(undefined);
  filterFechaFin = signal<string | undefined>(undefined);

  tiposPago = signal<CatalogoItem[]>([]);

  columns: TableColumn[] = [
    { field: 'numeroSolicitud', header: 'N° Solicitud', width: '130px' },
    { field: 'fechaSolicitud', header: 'Fecha', type: 'date', width: '110px', align: 'center' },
    { field: 'tipoPagoNombre', header: 'Tipo de Pago', width: '140px' },
    { field: 'montoTotalDesembolsado', header: 'Monto Total', type: 'currency', align: 'right', width: '140px' },
    { field: 'estadoNombre', header: 'Estado', type: 'badge', width: '120px', align: 'center' },
    { field: 'observacion', header: 'Observación' },
  ];

  private badgeMap: Record<string, StatusType> = {
    'PENDIENTE':  'Pendiente',
    'APROBADO':   'Aprobado',
    'RECHAZADO':  'Rechazado',
    'EN_PROCESO': 'Pendiente',
  };

  getBadgeStatus(value: string): StatusType {
    return this.badgeMap[value] ?? 'Pendiente';
  }

  private permissionService = inject(PermissionService);
  protected readonly puedeActivarCheque = computed(() => this.permissionService.hasPermission(PERMISSIONS.ACTIVAR_CHEQUES));
  private desembolsoRepo = inject(DesembolsoRepository);

  constructor(
    private getDesembolsosUseCase: GetDesembolsosByConvenioUseCase,
    private catalogoRepository: CatalogoRepository,
    private alertService: AlertService
  ) { }

  onSearch(): void {
    this.loadDesembolsos(0, 10);
  }

  ngOnInit(): void {
    this.loadCatalogos();
    this.loadDesembolsos();
  }

  loadCatalogos(): void {
    this.catalogoRepository.getByGrupo('TIPO_PAGO').subscribe(items => {
        this.tiposPago.set(items);
    });
  }

  loadLazyDesembolsos(event: any): void {
    this.loadDesembolsos(event.first, event.rows);
  }

  loadDesembolsos(offset = 0, limit = 10): void {
    if (!this.convenioId()) return;
    setTimeout(() => this.loading.set(true));

    this.getDesembolsosUseCase.execute(
        this.convenioId(),
        this.filterNumero(),
        this.filterTipoPago(),
        this.filterFechaInicio(),
        this.filterFechaFin(),
        offset,
        limit
    ).subscribe({
      next: (result) => {
        this.desembolsos.set(result.items);
        this.totalRecords.set(result.total);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar Desembolsos:', err);
        this.loading.set(false);
      }
    });
  }

  handleModalClose(refresh: boolean): void {
    this.showModal.set(false);
    if (refresh) this.loadDesembolsos();
  }

  activarCheque(id: number): void {
      this.alertService.confirm(
          '¿Activar y Efectivizar Cheque?',
          'Esta acción registrará la salida física en el Kardex y cambiará el estado de la solicitud a APROBADO.'
      ).then((result: any) => {
          if (result.isConfirmed) {
              this.loading.set(true);
              this.desembolsoRepo.activarCheque(id).subscribe({
                  next: () => {
                      this.loading.set(false);
                      this.alertService.show('Éxito', 'El cheque ha sido activado y efectivizado contablemente.', 'success');
                      this.loadDesembolsos();
                  },
                  error: (err) => {
                      this.loading.set(false);
                      this.alertService.show('Error', err.error?.mensaje || 'No se pudo activar el cheque.', 'error');
                  }
              });
          }
      });
  }

  viewDesembolso(id: number): void {
      this.alertService.show('Información', 'La vista de solicitud de desembolso está en construcción y estará disponible pronto.', 'info');
  }

  editDesembolso(id: number): void {
      this.alertService.show('Información', 'La edición de solicitud de desembolso está en construcción.', 'info');
  }
  
  deleteDesembolso(id: number): void {
      this.alertService.confirm('¿Eliminar Solicitud?', 'Esta acción no se puede deshacer.').then((result: any) => {
        if (result.isConfirmed) {
            this.alertService.show('Aviso', 'El borrado aún no está habilitado.', 'info');
        }
      });
  }
}

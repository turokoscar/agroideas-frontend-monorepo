import { StatusType, TableColumn, UIButtonComponent, UiDataTableComponent, UiFilterBarComponent, UiStatusPillComponent } from '@agroideas/ui';
import { AlertService } from '@agroideas/feedback';
import { PermissionService } from '@agroideas/security';
import { PERMISSIONS, formatSolicitudNumber } from '@agroideas/utils';
import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Desembolso, DesembolsoChequePendiente } from '../../../domain/models/desembolso.model';
import { DesembolsoModalComponent } from '../../components/desembolso-modal/desembolso-modal.component';
import { DesembolsoItemsModalComponent } from '../../components/desembolso-items-modal/desembolso-items-modal.component';
import { ActivarChequeModalComponent } from '../../components/activar-cheque-modal/activar-cheque-modal.component';
import { CatalogoRepository } from '../../../domain/repositories/catalogo.repository';
import { CatalogoItem } from '../../../domain/models/catalogo.model';
import { DesembolsoRepository } from '../../../domain/repositories/desembolso.repository';
import { finalize } from 'rxjs/operators';

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
    DesembolsoItemsModalComponent,
    ActivarChequeModalComponent,
    UIButtonComponent
  ],
  templateUrl: './desembolso.page.html',
  styleUrls: ['./desembolso.page.sass'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DesembolsoPageComponent implements OnInit {
  convenioId = input.required<number>();
  readOnly = input<boolean>(false);

  desembolsos = signal<Desembolso[]>([]);
  loading = signal<boolean>(false);
  totalRecords = signal<number>(0);
  showModal = signal<boolean>(false);
  modalMode = signal<'create' | 'edit'>('create');
  editingDesembolso = signal<Desembolso | undefined>(undefined);

  showItemsModal = signal<boolean>(false);
  viewingDesembolso = signal<Desembolso | undefined>(undefined);

  // Bandeja de cheques pendientes de activación (Supervisor, ver ADR-020)
  chequesPendientes = signal<DesembolsoChequePendiente[]>([]);
  loadingCheques = signal<boolean>(false);
  showActivarChequeModal = signal<boolean>(false);
  activandoCheque = signal<DesembolsoChequePendiente | undefined>(undefined);

  chequesColumns: TableColumn[] = [
    { field: 'correlativo', header: 'Correlativo', width: '140px' },
    { field: 'numeroSolicitud', header: 'N° Solicitud', width: '130px' },
    { field: 'fechaDevengado', header: 'Devengado el', type: 'date', width: '110px', align: 'center' },
    { field: 'monto', header: 'Monto', type: 'currency', align: 'right', width: '140px' },
    { field: 'observacion', header: 'Observación' },
  ];

  // Filtros
  filterNumero = signal<string | undefined>(undefined);
  filterTipoPago = signal<number | undefined>(undefined);
  filterFechaInicio = signal<string | undefined>(undefined);
  filterFechaFin = signal<string | undefined>(undefined);

  tiposPago = signal<CatalogoItem[]>([]);

  columns: TableColumn[] = [
    { field: 'numeroSolicitud', header: 'N° Solicitud', type: 'custom', width: '130px' },
    { field: 'fechaSolicitud', header: 'Fecha', type: 'date', width: '110px', align: 'center' },
    { field: 'tipoPagoNombre', header: 'Tipo de Pago', width: '140px' },
    { field: 'montoTotalDesembolsado', header: 'Monto Total', type: 'currency', align: 'right', width: '140px' },
    { field: 'estadoNombre', header: 'Estado', type: 'custom', width: '120px', align: 'center' },
    { field: 'estadoRendicion', header: 'Rendición', type: 'custom', width: '140px', align: 'center' },
    { field: 'observacion', header: 'Observación' },
  ];

  formatSolicitudNumber(row: Desembolso): string {
    return formatSolicitudNumber(row.numeroSolicitud, row.fechaSolicitud);
  }

  private badgeMap: Record<string, StatusType> = {
    'PENDIENTE':  'Pendiente',
    'APROBADO':   'Aprobado',
    'RECHAZADO':  'Rechazado',
    'EN_PROCESO': 'Pendiente',
  };

  getBadgeStatus(value: string): StatusType {
    return this.badgeMap[value] ?? 'Pendiente';
  }

  getEstadoRendicion(row: Desembolso): { status: StatusType; text: string } {
    const total = row.montoTotalDesembolsado || 0;
    const rendido = row.montoRendido || 0;

    if (rendido <= 0) {
      return { status: 'Pendiente', text: 'Pendiente de Rendir' };
    }
    if (rendido >= total - 0.01) {
      return { status: 'Aprobado', text: 'Rendido' };
    }
    return { status: 'Media', text: 'Rendido Parcial' };
  }

  private permissionService = inject(PermissionService);
  protected readonly puedeActivarCheque = computed(() => this.permissionService.hasPermission(PERMISSIONS.ACTIVAR_CHEQUES));
  private desembolsoRepo = inject(DesembolsoRepository);
  private catalogoRepository = inject(CatalogoRepository);
  private alertService = inject(AlertService);

  onSearch(): void {
    this.loadDesembolsos(0, 10);
  }

  ngOnInit(): void {
    this.loadCatalogos();
    this.loadDesembolsos();
    if (this.puedeActivarCheque()) {
      this.loadChequesPendientes();
    }
  }

  loadChequesPendientes(): void {
    if (!this.convenioId()) return;
    this.loadingCheques.set(true);
    this.desembolsoRepo.getChequesPendientesActivacion(this.convenioId())
      .pipe(finalize(() => this.loadingCheques.set(false)))
      .subscribe({
        next: (items) => this.chequesPendientes.set(items),
        error: () => { /* Error handled by AlertService or removed */ }
      });
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
    this.loading.set(true);

    this.desembolsoRepo.getByPostulante(
        this.convenioId(),
        this.filterNumero(),
        this.filterTipoPago(),
        this.filterFechaInicio(),
        this.filterFechaFin(),
        offset,
        limit
    ).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (result) => {
        this.desembolsos.set(result.items);
        this.totalRecords.set(result.total);
      },
      error: (err) => {
        // Error handled by AlertService or removed
      }
    });
  }

  openCreateModal(): void {
    this.modalMode.set('create');
    this.editingDesembolso.set(undefined);
    this.showModal.set(true);
  }

  handleModalClose(refresh: boolean): void {
    this.showModal.set(false);
    if (refresh) this.loadDesembolsos();
  }

  abrirActivarChequeModal(cheque: DesembolsoChequePendiente): void {
      this.activandoCheque.set(cheque);
      this.showActivarChequeModal.set(true);
  }

  handleActivarChequeModalClose(refresh: boolean): void {
      this.showActivarChequeModal.set(false);
      if (refresh) {
          this.loadChequesPendientes();
          this.loadDesembolsos();
      }
  }

  viewDesembolso(row: Desembolso): void {
      this.viewingDesembolso.set(row);
      this.showItemsModal.set(true);
  }

  handleItemsModalClose(): void {
      this.showItemsModal.set(false);
  }

  editDesembolso(row: Desembolso): void {
      if ((row.montoRendido || 0) > 0) {
          this.alertService.show('Acción no permitida', 'No se puede modificar una solicitud que ya tiene una rendición registrada.', 'warning');
          return;
      }
      this.modalMode.set('edit');
      this.editingDesembolso.set(row);
      this.showModal.set(true);
  }

  deleteDesembolso(row: Desembolso): void {
      if ((row.montoRendido || 0) > 0) {
          this.alertService.show('Acción no permitida', 'No se puede anular una solicitud que ya tiene una rendición registrada.', 'warning');
          return;
      }
      this.alertService.confirm('¿Anular Solicitud?', 'Esta acción no se puede deshacer.').then((result: any) => {
        if (result.isConfirmed) {
            this.loading.set(true);
            this.desembolsoRepo.anular(row.id).pipe(finalize(() => this.loading.set(false))).subscribe({
                next: () => {
                    this.alertService.toast('Solicitud anulada con éxito.');
                    this.loadDesembolsos();
                },
                error: (err) => {
                    this.alertService.show('Error', err.error?.mensaje || 'No se pudo anular la solicitud.', 'error');
                }
            });
        }
      });
  }
}

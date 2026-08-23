import { StatusType, TableColumn, UIButtonComponent, UiDataTableComponent, UiFilterBarComponent, UiStatusPillComponent } from '@agroideas/ui';
import { AlertService } from '@agroideas/feedback';
import { PermissionService } from '@agroideas/security';
import { PERMISSIONS, formatSolicitudNumber } from '@agroideas/utils';
import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Desembolso } from '../../../domain/models/desembolso.model';
import { DesembolsoModalComponent } from '../../components/desembolso-modal/desembolso-modal.component';
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
              this.desembolsoRepo.activarCheque(id).pipe(finalize(() => this.loading.set(false))).subscribe({
                  next: () => {
                      this.alertService.show('Éxito', 'El cheque ha sido activado y efectivizado contablemente.', 'success');
                      this.loadDesembolsos();
                  },
                  error: (err) => {
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

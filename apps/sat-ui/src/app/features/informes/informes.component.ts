import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, finalize } from 'rxjs';
import { UIButtonComponent, UiStatusPillComponent, UIModalComponent, UiDataTableComponent, UiFilterBarComponent } from '@agroideas/ui';
import type { TableColumn, StatusType } from '@agroideas/ui';
import { AlertService } from '@agroideas/feedback';
import { AuthService } from '../../core/services/auth.service';
import {
  InformeService,
  Informe,
  InformeDetalle,
  InformeSeccionesUpdate,
  GenerarInformePayload
} from '../../core/services/informe.service';
import { AsistenteService, Asistente } from '../../core/services/asistente.service';
import { formatDate, FormatDatePipe } from '@agroideas/utils';
import { getEstadoClass, getEstadoLabel } from '../../shared/utils/estado-labels';
import { InformeDetalleModalComponent } from './components/informe-detalle-modal/informe-detalle-modal.component';
import { InformeUploadPdfModalComponent } from './components/informe-upload-pdf-modal/informe-upload-pdf-modal.component';

@Component({
  selector: 'app-informes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    UIButtonComponent,
    UiStatusPillComponent,
    UIModalComponent,
    UiDataTableComponent,
    UiFilterBarComponent,
    FormatDatePipe,
    InformeDetalleModalComponent,
    InformeUploadPdfModalComponent
  ],
  templateUrl: './informes.component.html',
  styleUrl: './informes.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InformesComponent implements OnInit {
  private alertService = inject(AlertService);
  private authService = inject(AuthService);
  private informeService = inject(InformeService);
  private asistenteService = inject(AsistenteService);
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);

  isTecnico = computed(() => this.authService.user()?.role === 'TECNICO');

  informes = signal<Informe[]>([]);
  asistentes = signal<Asistente[]>([]);

  loading = signal(false);
  showGenerateModal = signal(false);
  showDetalleModal = signal(false);
  showUploadPdfModal = signal(false);
  generating = signal(false);
  isEditing = signal(false);
  saving = signal(false);
  uploadingPdf = signal(false);

  selectedDetalle = signal<InformeDetalle | null>(null);

  filtroAsistente = signal('');
  filtroEstado = signal('');
  filtroFechaInicio = signal('');
  filtroFechaFin = signal('');

  filtroForm = this.fb.group({
    ide_asistente: ['', [Validators.required]],
    fec_periodoInicio: ['', [Validators.required]],
    fec_periodoFin: ['', [Validators.required]]
  });

  filteredData = computed(() => {
    const data = this.processedData();
    const asistente = this.filtroAsistente().toLowerCase();
    const estado = this.filtroEstado();
    const fecInicio = this.filtroFechaInicio();
    const fecFin = this.filtroFechaFin();
    return data.filter(i => {
      if (asistente && !i.txt_asistente?.toLowerCase().includes(asistente)) return false;
      if (estado && i.estadoText !== estado && i.estadoValor !== estado) return false;
      if (fecInicio && i.fec_periodoInicio && i.fec_periodoInicio < fecInicio) return false;
      if (fecFin && i.fec_periodoFin && i.fec_periodoFin > fecFin) return false;
      return true;
    });
  });

  columns: TableColumn[] = [
    { field: 'txt_asistente', header: 'Asistente', sortable: true },
    { field: 'periodo', header: 'Período' },
    { field: 'estado', header: 'Estado', type: 'custom' },
    { field: 'cantidad_actividades', header: 'Actividades', type: 'number', align: 'center' },
    { field: 'cantidad_evidencias', header: 'Evidencias', type: 'number', align: 'center' },
    { field: 'flg_exportadoPdf', header: 'PDF', type: 'custom' }
  ];

  processedData = computed(() =>
    this.informes().map(i => {
      const evidenciasCount = i.cantidad_evidencias ?? 0;

      let statusValue: StatusType = 'Pendiente';
      const estadoRaw = (i.txt_estadoInforme || '').toLowerCase();
      const codRaw = (i.ide_estadoInforme || '').toString().toLowerCase();

      if (estadoRaw === 'presentado' || codRaw === 'presentado' || codRaw === '3') {
        statusValue = 'Aprobado';
      } else if (estadoRaw === 'generado' || codRaw === 'generado' || codRaw === '2') {
        statusValue = 'Media';
      } else if (estadoRaw === 'borrador' || codRaw === 'borrador' || codRaw === '1') {
        statusValue = 'Pendiente';
      }

      return {
        ...i,
        periodo: `${formatDate(i.fec_periodoInicio)} - ${formatDate(i.fec_periodoFin)}`,
        estadoValor: statusValue,
        estadoText: i.txt_estadoInforme || getEstadoLabel(i.ide_estadoInforme),
        cantidad_evidencias: evidenciasCount,
        tienePdf: i.flg_exportadoPdf && i.txt_rutaPdf
      };
    })
  );

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    const user = this.authService.user();
    if (!user) return;

    this.loading.set(true);

    forkJoin({
      informes: user.role === 'TECNICO'
        ? this.informeService.listarPorAsistente(user.id)
        : this.informeService.listar(),
      asistentes: this.asistenteService.listar()
    })
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: ({ informes, asistentes }) => {
          this.informes.set(informes);
          this.asistentes.set(asistentes);
        },
        error: (err) => {
          console.error('Error cargando datos de informes:', err);
          this.alertService.toast('Error cargando informes', 'error');
        }
      });
  }

  limpiarFiltros() {
    this.filtroAsistente.set('');
    this.filtroEstado.set('');
    this.filtroFechaInicio.set('');
    this.filtroFechaFin.set('');
  }

  openGenerateModal() {
    const user = this.authService.user();
    const isTecnico = user?.role === 'TECNICO';
    this.filtroForm.reset({
      ide_asistente: isTecnico ? user.id : '',
      fec_periodoInicio: '',
      fec_periodoFin: ''
    });
    if (isTecnico) {
      this.filtroForm.get('ide_asistente')?.disable();
    } else {
      this.filtroForm.get('ide_asistente')?.enable();
    }
    this.showGenerateModal.set(true);
  }

  closeGenerateModal() {
    this.showGenerateModal.set(false);
    this.filtroForm.reset();
  }

  generarReporte() {
    if (this.filtroForm.invalid) {
      this.filtroForm.markAllAsTouched();
      this.alertService.toast('Por favor complete todos los campos obligatorios correctamente.', 'warning');
      return;
    }

    this.generating.set(true);
    const formValue = this.filtroForm.getRawValue();

    const payload: GenerarInformePayload = {
      ide_asistente: formValue.ide_asistente || '',
      fec_inicio: formValue.fec_periodoInicio
        ? new Date(formValue.fec_periodoInicio).toISOString()
        : null,
      fec_fin: formValue.fec_periodoFin
        ? new Date(formValue.fec_periodoFin).toISOString()
        : null
    };

    this.informeService.generar(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (res) => {
        this.loadData();
        this.closeGenerateModal();
        this.alertService.toast(res.mensaje || 'Reporte generado exitosamente');
      },
      error: (err) => {
        console.error(err);
        this.alertService.toast(err.error?.mensaje || 'Error al generar reporte', 'error');
      },
      complete: () => this.generating.set(false)
    });
  }

  verDetalle(informe: Informe) {
    this.informeService.obtenerDetalle(informe.ide_informe)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detalle) => {
          this.selectedDetalle.set(detalle);
          this.showDetalleModal.set(true);
        },
        error: () => this.alertService.toast('Error al cargar detalle del informe', 'error')
      });
  }

  editarInforme(informe: Informe) {
    this.informeService.obtenerDetalle(informe.ide_informe)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detalle) => {
          this.selectedDetalle.set(detalle);
          this.isEditing.set(true);
          this.showDetalleModal.set(true);
        },
        error: () => this.alertService.toast('Error al cargar detalle del informe', 'error')
      });
  }

  closeDetalleModal() {
    this.showDetalleModal.set(false);
    this.isEditing.set(false);
    this.selectedDetalle.set(null);
  }

  toggleEdit() {
    this.isEditing.update(v => !v);
  }

  guardarSecciones() {
    const detalle = this.selectedDetalle();
    if (!detalle) return;

    this.saving.set(true);

    const payload: InformeSeccionesUpdate = {
      ide_informe: detalle.ide_informe,
      txt_resumenGeneral: detalle.txt_resumenGeneral ?? '',
      txt_resultados: detalle.txt_resultados ?? '',
      txt_problemas: detalle.txt_problemas ?? '',
      txt_propuestas: detalle.txt_propuestas ?? '',
      txt_recomendaciones: detalle.txt_recomendaciones ?? '',
      txt_metas: detalle.txt_metas ?? '',
      txt_conclusion: detalle.txt_conclusion ?? ''
    };

    this.informeService.actualizarSecciones(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (res) => {
        this.isEditing.set(false);
        this.alertService.toast(res.mensaje || 'Secciones guardadas exitosamente');
      },
      error: (err) => {
        console.error(err);
        this.alertService.toast(err.error?.mensaje || 'Error al guardar secciones', 'error');
      },
      complete: () => this.saving.set(false)
    });
  }

  descargarPdf() {
    const detalle = this.selectedDetalle();
    if (!detalle) return;

    this.alertService.toast('Generando PDF...', 'info');
    this.informeService.descargarPdf(detalle.ide_informe)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `InformeTecnico_${detalle.ide_informe}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.alertService.toast('PDF descargado correctamente');
      },
      error: (err) => {
        console.error('Error al descargar PDF:', err);
        this.alertService.toast('Error al descargar el PDF', 'error');
      }
    });
  }

  descargarPdfFirmado() {
    const detalle = this.selectedDetalle();
    if (!detalle) return;

    this.informeService.descargarPdfFirmado(detalle.ide_informe)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `InformeFirmado_${detalle.ide_informe}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          this.alertService.toast('PDF firmado descargado correctamente');
        },
        error: (err) => {
          console.error('Error al descargar PDF firmado:', err);
          this.alertService.toast('Error al descargar el PDF firmado', 'error');
        }
      });
  }

  openUploadPdfModal() {
    this.showUploadPdfModal.set(true);
  }

  closeUploadPdfModal() {
    this.showUploadPdfModal.set(false);
  }

  subirPdfFirmado(file: File) {
    const detalle = this.selectedDetalle();
    if (!detalle || !file) return;

    this.uploadingPdf.set(true);

    this.informeService.subirPdfFirmado(detalle.ide_informe, file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (res) => {
        this.alertService.toast(res.mensaje || 'PDF firmado adjuntado exitosamente');
        this.closeUploadPdfModal();
        this.loadData();
        this.verDetalle({ ide_informe: detalle.ide_informe } as Informe);
      },
      error: (err) => {
        console.error(err);
        this.alertService.toast(err.error?.mensaje || 'Error al adjuntar PDF firmado', 'error');
      },
      complete: () => this.uploadingPdf.set(false)
    });
  }

  getEstadoClass(cod: string): string {
    return getEstadoClass(cod);
  }

  getEstadoLabel(cod: string): string {
    return getEstadoLabel(cod);
  }

  getAsistenteNombre(ide: string): string {
    const a = this.asistentes().find(x => x.ideAsistente === ide);
    return a ? `${a.txtNombres} ${a.txtApellidoPaterno}` : ide;
  }

  getPdfBadgeClass(tienePdf: boolean): string {
    return tienePdf ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500';
  }

  getPdfBadgeText(tienePdf: boolean): string {
    return tienePdf ? 'Con PDF' : 'Sin PDF';
  }
}

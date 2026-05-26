import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { UIButtonComponent, UiStatusPillComponent, UIModalComponent, UiDataTableComponent } from '@agroideas/ui';
import type { TableColumn } from '@agroideas/ui';
import { environment } from '../../../environments/environment';
import { AlertService } from '@agroideas/feedback';
import { ResponseDto } from '@agroideas/utils';

interface Asignacion {
  ide_asignacion: number;
  ide_asistente: string;
  txt_asistente: string;
  ide_organizacion: string;
  txt_organizacion: string;
  txtTipoServicio: string;
  fecInicio: string | null;
  fecFin: string | null;
  txtObservacion: string;
  flgActivo: boolean;
  fec_registro: string;
}

interface AsignacionPayload {
  ide_asistente: string;
  ide_organizacion: string;
  txtTipoServicio: string;
  fecInicio: string | null;
  fecFin: string | null;
  txtObservacion: string;
  ide_asignacion?: number | null;
  flgActivo?: boolean;
}

interface Asistente {
  ideAsistente: string;
  txtNombres: string;
  txtApellidoPaterno: string;
  txtApellidoMaterno: string;
}

interface Organizacion {
  ideOrganizacion: string;
  txtNombre: string;
  numeroConvenio: string;
  codUbigeo?: string;
}

@Component({
  selector: 'app-asignaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, UIButtonComponent, UiStatusPillComponent, UIModalComponent, UiDataTableComponent],
  templateUrl: './asignaciones.component.html',
  styleUrl: './asignaciones.component.css'
})
export class AsignacionesComponent implements OnInit {
  private http = inject(HttpClient);
  private alertService = inject(AlertService);

  asignaciones = signal<Asignacion[]>([]);
  asistentes = signal<Asistente[]>([]);
  organizaciones = signal<Organizacion[]>([]);

  regionBusqueda = signal('');
  regionSeleccionada = signal('');
  regiones = signal<string[]>([]);

  loading = signal(false);
  showModal = signal(false);
  editingId = signal<number | null>(null);

  private searchTimeout: ReturnType<typeof setTimeout> | undefined;

  form = {
    ide_asistente: '',
    ide_organizacion: '',
    txtTipoServicio: '',
    fecInicio: '',
    fecFin: '',
    txtObservacion: ''
  };

  tiposServicio = [
    'Asistencia Técnica Pecuaria',
    'Asistencia Técnica Agrícola',
    'Capacitación',
    'Seguimiento',
    'Asesoría Técnica'
  ];

  columns: TableColumn[] = [
    { field: 'txt_asistente', header: 'Asistente', sortable: true },
    { field: 'txt_organizacion', header: 'Organización', sortable: true },
    { field: 'txtTipoServicio', header: 'Tipo de Servicio' },
    { field: 'periodo', header: 'Período' },
    { field: 'estado', header: 'Estado', type: 'custom' }
  ];

  processedData = computed(() =>
    this.asignaciones().map(a => ({
      ...a,
      periodo: `${this.formatDate(a.fecInicio)} - ${this.formatDate(a.fecFin)}`,
      estadoText: a.flgActivo ? 'Activo' : 'Inactivo',
      estadoValor: a.flgActivo ? 'Activo' : 'Finalizado'
    }))
  );

  ngOnInit() {
    this.loadAsignaciones();
    this.loadAsistentes();
    this.loadOrganizaciones(true);
  }

  loadAsignaciones() {
    this.loading.set(true);
    this.http.get<ResponseDto<Asignacion[]>>(`${environment.apiUrl}/asignaciones`).subscribe({
      next: (res) => this.asignaciones.set(res.datos ?? []),
      error: () => {
        console.error('Error cargando asignaciones');
        this.alertService.toast('Error cargando asignaciones', 'error');
      }
    });
  }

  loadAsistentes() {
    this.http.get<ResponseDto<Asistente[]>>(`${environment.apiUrl}/asistentes`).subscribe({
      next: (res) => this.asistentes.set(res.datos ?? []),
      error: () => console.error('Error cargando asistentes')
    });
  }

  loadOrganizaciones(extraerRegiones = false) {
    const params = new URLSearchParams();
    if (this.regionBusqueda()) params.set('busqueda', this.regionBusqueda());
    if (this.regionSeleccionada()) params.set('region', this.regionSeleccionada());

    const url = `${environment.apiUrl}/organizaciones${params.toString() ? '?' + params.toString() : ''}`;
    this.http.get<ResponseDto<Organizacion[]>>(url).subscribe({
      next: (res) => {
        const datos = res.datos ?? [];
        this.organizaciones.set(datos);
        if (extraerRegiones) {
          const unique = [...new Set(datos.map(o => o.codUbigeo).filter(Boolean))].sort();
          this.regiones.set(unique as string[]);
        }
        this.loading.set(false);
      },
      error: () => console.error('Error cargando organizaciones')
    });
  }

  onSearchChange(value: string) {
    this.regionBusqueda.set(value);
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => this.loadOrganizaciones(), 300);
  }

  onRegionChange(value: string) {
    this.regionSeleccionada.set(value);
    this.loadOrganizaciones();
  }

  openModal(asignacion?: Asignacion) {
    if (asignacion) {
      this.editingId.set(asignacion.ide_asignacion);
      this.form = {
        ide_asistente: asignacion.ide_asistente,
        ide_organizacion: asignacion.ide_organizacion,
        txtTipoServicio: asignacion.txtTipoServicio,
        fecInicio: asignacion.fecInicio ? asignacion.fecInicio.split('T')[0] : '',
        fecFin: asignacion.fecFin ? asignacion.fecFin.split('T')[0] : '',
        txtObservacion: asignacion.txtObservacion || ''
      };
    } else {
      this.editingId.set(null);
      this.form = {
        ide_asistente: '',
        ide_organizacion: '',
        txtTipoServicio: '',
        fecInicio: '',
        fecFin: '',
        txtObservacion: ''
      };
    }
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.editingId.set(null);
  }

  save() {
    const payload: AsignacionPayload = {
      ide_asistente: this.form.ide_asistente,
      ide_organizacion: this.form.ide_organizacion,
      txtTipoServicio: this.form.txtTipoServicio,
      fecInicio: this.form.fecInicio ? new Date(this.form.fecInicio).toISOString() : null,
      fecFin: this.form.fecFin ? new Date(this.form.fecFin).toISOString() : null,
      txtObservacion: this.form.txtObservacion
    };

    if (this.editingId()) {
      payload.ide_asignacion = this.editingId();
      payload.flgActivo = true;
      this.http.put<ResponseDto<unknown>>(`${environment.apiUrl}/asignaciones`, payload).subscribe({
        next: (res) => {
          this.alertService.toast(res.mensaje || 'Asignación actualizada con éxito');
          this.loadAsignaciones();
          this.closeModal();
        },
        error: (err) => {
          console.error(err);
          this.alertService.toast(err.error?.mensaje || 'Error al actualizar', 'error');
        }
      });
    } else {
      this.http.post<ResponseDto<unknown>>(`${environment.apiUrl}/asignaciones`, payload).subscribe({
        next: (res) => {
          this.alertService.toast(res.mensaje || 'Asignación creada con éxito');
          this.loadAsignaciones();
          this.closeModal();
        },
        error: (err) => {
          console.error(err);
          this.alertService.toast(err.error?.mensaje || 'Error al crear', 'error');
        }
      });
    }
  }

  toggleEstado(asignacion: Asignacion) {
    this.http.patch<ResponseDto<unknown>>(`${environment.apiUrl}/asignaciones/${asignacion.ide_asignacion}/estado`, !asignacion.flgActivo).subscribe({
      next: (res) => {
        this.alertService.toast(res.mensaje || (asignacion.flgActivo ? 'Asignación desactivada' : 'Asignación activada'));
        this.loadAsignaciones();
      },
      error: () => this.alertService.toast('Error al cambiar estado', 'error')
    });
  }

  delete(id: number) {
    this.alertService.confirm('¿Estás seguro?', '¿Desea eliminar permanentemente esta asignación?').then((result) => {
      if (result.isConfirmed) {
        this.http.delete<ResponseDto<unknown>>(`${environment.apiUrl}/asignaciones/${id}`).subscribe({
          next: (res) => {
            this.alertService.toast(res.mensaje || 'Asignación eliminada con éxito');
            this.loadAsignaciones();
          },
          error: () => this.alertService.toast('Error al eliminar', 'error')
        });
      }
    });
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-PE');
  }

  getAsistenteNombre(ide: string): string {
    const a = this.asistentes().find(x => x.ideAsistente === ide);
    return a ? `${a.txtNombres} ${a.txtApellidoPaterno}` : ide;
  }
}

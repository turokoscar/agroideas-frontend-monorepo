import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { UIButtonComponent, UiStatusPillComponent, UIModalComponent, UiDataTableComponent } from '@agroideas/ui';
import type { TableColumn } from '@agroideas/ui';
import { AlertService } from '@agroideas/feedback';
import { ResponseDto } from '@agroideas/utils';
import { environment } from '../../../environments/environment';

interface Asistente {
  ideAsistente: string;
  txtNombres: string;
  txtApellidoPaterno: string;
  txtApellidoMaterno: string;
  txtCorreo: string;
  codUsuario: string;
  txtPasswordHash: string;
  fecInicioVigencia: string | null;
  fecFinVigencia: string | null;
  flgActivo: boolean;
  fecRegistro?: string | null;
}

interface AsistentePayload {
  txtNombres: string;
  txtApellidoPaterno: string;
  txtApellidoMaterno: string;
  txtCorreo: string;
  codUsuario: string;
  txtPasswordHash?: string;
  ideAsistente?: string | null;
  fecInicioVigencia: string;
  fecFinVigencia: string;
}

@Component({
  selector: 'app-asistentes',
  standalone: true,
  imports: [CommonModule, FormsModule, UIButtonComponent, UiStatusPillComponent, UIModalComponent, UiDataTableComponent],
  templateUrl: './asistentes.component.html'
})
export class AsistentesComponent implements OnInit {
  private http = inject(HttpClient);
  private alertService = inject(AlertService);

  asistentes = signal<Asistente[]>([]);
  loading = signal(false);
  showModal = signal(false);
  editingId = signal<string | null>(null);

  form = {
    txtNombres: '',
    txtApellidoPaterno: '',
    txtApellidoMaterno: '',
    txtCorreo: '',
    codUsuario: '',
    txtPasswordHash: '',
    fecInicioVigencia: '',
    fecFinVigencia: ''
  };

  columns: TableColumn[] = [
    { field: 'nombreCompleto', header: 'Asistente Técnico', sortable: true },
    { field: 'codUsuario', header: 'Usuario' },
    { field: 'txtCorreo', header: 'Contacto' },
    { field: 'periodo', header: 'Período de Vigencia' },
    { field: 'estado', header: 'Estado', type: 'custom' }
  ];

  processedData = computed(() =>
    this.asistentes().map(a => ({
      ...a,
      nombreCompleto: `${a.txtNombres} ${a.txtApellidoPaterno} ${a.txtApellidoMaterno}`.trim(),
      periodo: `${this.formatDate(a.fecInicioVigencia)} - ${this.formatDate(a.fecFinVigencia)}`,
      estadoText: a.flgActivo ? 'Activo' : 'Inactivo',
      estadoValor: a.flgActivo ? 'Activo' : 'Finalizado'
    }))
  );

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    this.http.get<ResponseDto<Asistente[]>>(`${environment.apiUrl}/asistentes`).subscribe({
      next: (res) => {
        this.asistentes.set(res.datos ?? []);
      },
      error: (err) => {
        console.error('Error cargando asistentes:', err);
        this.alertService.toast('Error cargando asistentes', 'error');
      },
      complete: () => this.loading.set(false)
    });
  }

  openModal(asistente?: Asistente) {
    if (asistente) {
      this.editingId.set(asistente.ideAsistente);
      this.form = {
        txtNombres: asistente.txtNombres,
        txtApellidoPaterno: asistente.txtApellidoPaterno,
        txtApellidoMaterno: asistente.txtApellidoMaterno,
        txtCorreo: asistente.txtCorreo || '',
        codUsuario: asistente.codUsuario,
        txtPasswordHash: '',
        fecInicioVigencia: asistente.fecInicioVigencia ? asistente.fecInicioVigencia.split('T')[0] : '',
        fecFinVigencia: asistente.fecFinVigencia ? asistente.fecFinVigencia.split('T')[0] : ''
      };
    } else {
      this.editingId.set(null);
      this.form = {
        txtNombres: '',
        txtApellidoPaterno: '',
        txtApellidoMaterno: '',
        txtCorreo: '',
        codUsuario: '',
        txtPasswordHash: '',
        fecInicioVigencia: new Date().toISOString().split('T')[0],
        fecFinVigencia: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString().split('T')[0]
      };
    }
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.editingId.set(null);
  }

  save() {
    if (!this.form.txtNombres || !this.form.txtApellidoPaterno || !this.form.codUsuario) {
      this.alertService.toast('Por favor complete los campos obligatorios.', 'warning');
      return;
    }

    if (!this.editingId() && !this.form.txtPasswordHash) {
      this.alertService.toast('La contraseña es requerida para nuevos asistentes.', 'warning');
      return;
    }

    const payload: AsistentePayload = {
      txtNombres: this.form.txtNombres,
      txtApellidoPaterno: this.form.txtApellidoPaterno,
      txtApellidoMaterno: this.form.txtApellidoMaterno,
      txtCorreo: this.form.txtCorreo,
      codUsuario: this.form.codUsuario,
  fecInicioVigencia: this.form.fecInicioVigencia
    ? new Date(this.form.fecInicioVigencia).toISOString()
    : new Date().toISOString(),
  fecFinVigencia: this.form.fecFinVigencia
    ? new Date(this.form.fecFinVigencia).toISOString()
    : new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()
    };

    if (this.form.txtPasswordHash) {
      payload.txtPasswordHash = this.form.txtPasswordHash;
    }

    if (this.editingId()) {
      payload.ideAsistente = this.editingId();
      this.http.put<ResponseDto<unknown>>(`${environment.apiUrl}/asistentes`, payload).subscribe({
        next: (res) => {
          this.alertService.toast(res.mensaje || 'Asistente actualizado con éxito');
          this.loadData();
          this.closeModal();
        },
        error: (err) => {
          console.error(err);
          this.alertService.toast(err.error?.mensaje || 'Error al actualizar asistente.', 'error');
        }
      });
    } else {
      this.http.post<ResponseDto<unknown>>(`${environment.apiUrl}/asistentes`, payload).subscribe({
        next: (res) => {
          this.alertService.toast(res.mensaje || 'Asistente registrado con éxito');
          this.loadData();
          this.closeModal();
        },
        error: (err) => {
          console.error(err);
          this.alertService.toast(err.error?.mensaje || 'Error al registrar asistente.', 'error');
        }
      });
    }
  }

  async toggleEstado(asistente: Asistente) {
    const accion = asistente.flgActivo ? 'inhabilitar' : 'habilitar';
    const confirm = await this.alertService.confirm(
      `¿${asistente.flgActivo ? 'Inhabilitar' : 'Habilitar'} asistente?`,
      `Está a punto de ${accion} a "${asistente.txtNombres} ${asistente.txtApellidoPaterno}". ¿Desea continuar?`
    );
    if (!confirm.isConfirmed) return;

    const nuevoEstado = !asistente.flgActivo;
    this.http.patch<ResponseDto<unknown>>(`${environment.apiUrl}/asistentes/${asistente.ideAsistente}/estado`, nuevoEstado).subscribe({
      next: (res) => {
        this.alertService.toast(res.mensaje || (nuevoEstado ? 'Asistente habilitado' : 'Asistente inhabilitado'));
        this.loadData();
      },
      error: (err) => {
        console.error(err);
        this.alertService.toast(err.error?.mensaje || 'Error al cambiar el estado del asistente.', 'error');
      }
    });
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-PE');
  }
}

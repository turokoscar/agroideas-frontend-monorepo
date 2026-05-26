import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { UICardComponent, UIButtonComponent, UiStatusPillComponent, UIModalComponent } from '@agroideas/ui';
import { environment } from '../../../environments/environment';
import { AlertService } from '@agroideas/feedback';

interface Asignacion {
  ide_asignacion: number;
  ide_asistente: string;
  txt_asistente: string;
  ide_organizacion: string;
  txt_organizacion: string;
  txtTipoServicio: string;
  fecInicio: string;
  fecFin: string;
  txtObservacion: string;
  flgActivo: boolean;
  fec_registro: string;
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
}

@Component({
  selector: 'app-asignaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, UICardComponent, UIButtonComponent, UiStatusPillComponent, UIModalComponent],
  templateUrl: './asignaciones.component.html',
  styleUrl: './asignaciones.component.css'
})
export class AsignacionesComponent implements OnInit {
  private http = inject(HttpClient);
  private alertService = inject(AlertService);

  asignaciones = signal<Asignacion[]>([]);
  asistentes = signal<Asistente[]>([]);
  organizaciones = signal<Organizacion[]>([]);
  
  loading = signal(false);
  showModal = signal(false);
  editingId = signal<number | null>(null);

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

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    
    this.http.get<Asignacion[]>(`${environment.apiUrl}/asignacion`).subscribe({
      next: (data) => this.asignaciones.set(data),
      error: () => {
        console.error('Error cargando asignaciones');
        this.alertService.toast('Error cargando asignaciones', 'error');
      }
    });

    this.http.get<Asistente[]>(`${environment.apiUrl}/asistente`).subscribe({
      next: (data) => this.asistentes.set(data),
      error: () => console.error('Error cargando asistentes')
    });

    this.http.get<Organizacion[]>(`${environment.apiUrl}/organizacion`).subscribe({
      next: (data) => this.organizaciones.set(data),
      error: () => console.error('Error cargando organizaciones'),
      complete: () => this.loading.set(false)
    });
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
    const payload = {
      ide_asistente: this.form.ide_asistente,
      ide_organizacion: this.form.ide_organizacion,
      txtTipoServicio: this.form.txtTipoServicio,
      fecInicio: this.form.fecInicio,
      fecFin: this.form.fecFin,
      txtObservacion: this.form.txtObservacion
    };

    if (this.editingId()) {
      this.http.put(`${environment.apiUrl}/asignacion`, { ...payload, ide_asignacion: this.editingId(), flgActivo: true }).subscribe({
        next: () => {
          this.alertService.toast('Asignación actualizada con éxito');
          this.loadData();
          this.closeModal();
        },
        error: (err) => {
          console.error(err);
          this.alertService.toast('Error al actualizar', 'error');
        }
      });
    } else {
      this.http.post(`${environment.apiUrl}/asignacion`, payload).subscribe({
        next: () => {
          this.alertService.toast('Asignación creada con éxito');
          this.loadData();
          this.closeModal();
        },
        error: (err) => {
          console.error(err);
          this.alertService.toast('Error al crear', 'error');
        }
      });
    }
  }

  toggleEstado(asignacion: Asignacion) {
    this.http.patch(`${environment.apiUrl}/asignacion/${asignacion.ide_asignacion}/estado`, !asignacion.flgActivo).subscribe({
      next: () => {
        this.alertService.toast(asignacion.flgActivo ? 'Asignación desactivada' : 'Asignación activada');
        this.loadData();
      },
      error: () => this.alertService.toast('Error al cambiar estado', 'error')
    });
  }

  delete(id: number) {
    this.alertService.confirm('¿Estás seguro?', '¿Desea eliminar permanentemente esta asignación?').then((result) => {
      if (result.isConfirmed) {
        this.http.delete(`${environment.apiUrl}/asignacion/${id}`).subscribe({
          next: () => {
            this.alertService.toast('Asignación eliminada con éxito');
            this.loadData();
          },
          error: () => this.alertService.toast('Error al eliminar', 'error')
        });
      }
    });
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-PE');
  }

  getAsistenteNombre(ide: string): string {
    const a = this.asistentes().find(x => x.ideAsistente === ide);
    return a ? `${a.txtNombres} ${a.txtApellidoPaterno}` : ide;
  }
}
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { UIButtonComponent, UICardComponent, UiStatusPillComponent, UIModalComponent } from '@agroideas/ui';
import { AlertService } from '@agroideas/feedback';
import { environment } from '../../../environments/environment';

interface Asistente {
  ideAsistente: string;
  txtNombres: string;
  txtApellidoPaterno: string;
  txtApellidoMaterno: string;
  txtCorreo: string;
  codUsuario: string;
  txtPasswordHash: string;
  fecInicioVigencia: string;
  fecFinVigencia: string;
  flgActivo: boolean;
  fecRegistro?: string;
}

@Component({
  selector: 'app-asistentes',
  standalone: true,
  imports: [CommonModule, FormsModule, UIButtonComponent, UICardComponent, UiStatusPillComponent, UIModalComponent],
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

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    this.http.get<Asistente[] | { datos?: Asistente[]; data?: Asistente[] }>(`${environment.apiUrl}/asistente`).subscribe({
      next: (res) => {
        const data = Array.isArray(res) ? res : (res.datos ?? res.data);
        this.asistentes.set(Array.isArray(data) ? data : []);
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

    const payload: Partial<Asistente> & { txtPasswordHash?: string; ideAsistente?: string | null } = {
      txtNombres: this.form.txtNombres,
      txtApellidoPaterno: this.form.txtApellidoPaterno,
      txtApellidoMaterno: this.form.txtApellidoMaterno,
      txtCorreo: this.form.txtCorreo,
      codUsuario: this.form.codUsuario,
      fecInicioVigencia: new Date(this.form.fecInicioVigencia).toISOString(),
      fecFinVigencia: new Date(this.form.fecFinVigencia).toISOString()
    };

    if (this.form.txtPasswordHash) {
      payload.txtPasswordHash = this.form.txtPasswordHash;
    }

    if (this.editingId()) {
      payload.ideAsistente = this.editingId() ?? undefined;
      this.http.put(`${environment.apiUrl}/asistente`, payload).subscribe({
        next: () => {
          this.alertService.toast('Asistente actualizado con éxito');
          this.loadData();
          this.closeModal();
        },
        error: (err) => {
          console.error(err);
          this.alertService.toast('Error al actualizar asistente.', 'error');
        }
      });
    } else {
      this.http.post(`${environment.apiUrl}/asistente`, payload).subscribe({
        next: () => {
          this.alertService.toast('Asistente registrado con éxito');
          this.loadData();
          this.closeModal();
        },
        error: (err) => {
          console.error(err);
          this.alertService.toast('Error al registrar asistente.', 'error');
        }
      });
    }
  }

  toggleEstado(asistente: Asistente) {
    const nuevoEstado = !asistente.flgActivo;
    this.http.patch(`${environment.apiUrl}/asistente/${asistente.ideAsistente}/estado`, nuevoEstado).subscribe({
      next: () => {
        this.alertService.toast(nuevoEstado ? 'Asistente habilitado' : 'Asistente inhabilitado');
        this.loadData();
      },
      error: (err) => {
        console.error(err);
        this.alertService.toast('Error al cambiar el estado del asistente.', 'error');
      }
    });
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-PE');
  }
}

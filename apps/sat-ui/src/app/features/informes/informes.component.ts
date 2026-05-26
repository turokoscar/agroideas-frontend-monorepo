import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { UIButtonComponent, UICardComponent, UiStatusPillComponent, UIModalComponent } from '@agroideas/ui';
import { AlertService } from '@agroideas/feedback';
import { environment } from '../../../environments/environment';

interface Informe {
  ide_informe: number;
  ide_asistente: string;
  txt_asistente: string;
  ide_estadoInforme: string;
  txt_estadoInforme: string;
  fec_periodoInicio: string;
  fec_periodoFin: string;
  fec_generacion: string;
  txt_resumenGeneral: string;
  txt_conclusion: string;
  cantidad_actividades: number;
  cantidad_evidencias: number;
  fec_registro: string;
}

interface InformeDetalle {
  ide_informe: number;
  txt_asistente: string;
  fec_periodoInicio: string;
  fec_periodoFin: string;
  fec_generacion: string;
  txt_resumenGeneral: string;
  txt_conclusion: string;
  actividades: ActividadReporte[];
  resumenHashes: {
    total_evidencias: number;
    evidencias_integras: number;
    evidencias_modificadas: number;
    hashes: HashDetalle[];
  };
}

interface ActividadReporte {
  ide_actividad: string;
  txt_organizacion: string;
  txt_tipoActividad: string;
  fec_registro: string;
  txt_observaciones: string;
}

interface HashDetalle {
  ide_evidencia: string;
  txt_hash: string;
  flg_integro: boolean;
}

interface Asistente {
  ideAsistente: string;
  txtNombres: string;
  txtApellidoPaterno: string;
  txtApellidoMaterno: string;
}

@Component({
  selector: 'app-informes',
  standalone: true,
  imports: [CommonModule, FormsModule, UIButtonComponent, UICardComponent, UiStatusPillComponent, UIModalComponent],
  templateUrl: './informes.component.html',
  styleUrl: './informes.component.css'
})
export class InformesComponent implements OnInit {
  private http = inject(HttpClient);
  private alertService = inject(AlertService);

  informes = signal<Informe[]>([]);
  asistentes = signal<Asistente[]>([]);
  
  loading = signal(false);
  showGenerateModal = signal(false);
  showDetalleModal = signal(false);
  generating = signal(false);

  selectedDetalle = signal<InformeDetalle | null>(null);

  form = {
    ide_asistente: '',
    fec_periodoInicio: '',
    fec_periodoFin: ''
  };

  estadosInforme = [
    { cod: 'BORRADOR', label: 'Borrador', color: 'bg-gray-100 text-gray-600' },
    { cod: 'GENERADO', label: 'Generado', color: 'bg-blue-100 text-blue-700' },
    { cod: 'PRESENTADO', label: 'Presentado', color: 'bg-green-100 text-green-700' }
  ];

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    
    this.http.get<Informe[]>(`${environment.apiUrl}/informe`).subscribe({
      next: (data) => this.informes.set(data),
      error: () => {
        console.error('Error cargando informes');
        this.alertService.toast('Error cargando informes', 'error');
      }
    });

    this.http.get<Asistente[]>(`${environment.apiUrl}/asistente`).subscribe({
      next: (data) => this.asistentes.set(data),
      error: () => console.error('Error cargando asistentes'),
      complete: () => this.loading.set(false)
    });
  }

  openGenerateModal() {
    this.form = {
      ide_asistente: '',
      fec_periodoInicio: '',
      fec_periodoFin: ''
    };
    this.showGenerateModal.set(true);
  }

  closeGenerateModal() {
    this.showGenerateModal.set(false);
  }

  generarReporte() {
    if (!this.form.ide_asistente || !this.form.fec_periodoInicio || !this.form.fec_periodoFin) {
      this.alertService.toast('Complete todos los campos obligatorios', 'warning');
      return;
    }

    this.generating.set(true);

    const payload = {
      ide_asistente: this.form.ide_asistente,
      fec_inicio: this.form.fec_periodoInicio,
      fec_fin: this.form.fec_periodoFin
    };

    this.http.post(`${environment.apiUrl}/informe/generar`, payload).subscribe({
      next: () => {
        this.loadData();
        this.closeGenerateModal();
        this.alertService.toast('Reporte generado exitosamente');
      },
      error: (err) => {
        console.error(err);
        this.alertService.toast('Error al generar reporte', 'error');
      },
      complete: () => this.generating.set(false)
    });
  }

  verDetalle(informe: Informe) {
    this.http.get<InformeDetalle>(`${environment.apiUrl}/informe/${informe.ide_informe}/detalle`).subscribe({
      next: (data) => {
        this.selectedDetalle.set(data);
        this.showDetalleModal.set(true);
      },
      error: () => this.alertService.toast('Error al cargar detalle del informe', 'error')
    });
  }

  closeDetalleModal() {
    this.showDetalleModal.set(false);
    this.selectedDetalle.set(null);
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-PE');
  }

  getEstadoClass(cod: string): string {
    const estado = this.estadosInforme.find(e => e.cod === cod);
    return estado ? estado.color : 'bg-gray-100 text-gray-600';
  }

  getEstadoLabel(cod: string): string {
    const estado = this.estadosInforme.find(e => e.cod === cod);
    return estado ? estado.label : cod;
  }

  getAsistenteNombre(ide: string): string {
    const a = this.asistentes().find(x => x.ideAsistente === ide);
    return a ? `${a.txtNombres} ${a.txtApellidoPaterno}` : ide;
  }
}
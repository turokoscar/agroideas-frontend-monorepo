import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { UIButtonComponent, UiStatusPillComponent, UIModalComponent, UiDataTableComponent } from '@agroideas/ui';
import type { TableColumn } from '@agroideas/ui';
import { AlertService } from '@agroideas/feedback';
import { ResponseDto } from '@agroideas/utils';
import { environment } from '../../../environments/environment';

interface Informe {
  ide_informe: number;
  ide_asistente: string;
  txt_asistente: string;
  ide_estadoInforme: string;
  txt_estadoInforme: string;
  fec_periodoInicio: string | null;
  fec_periodoFin: string | null;
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
  imports: [CommonModule, FormsModule, UIButtonComponent, UiStatusPillComponent, UIModalComponent, UiDataTableComponent],
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

  columns: TableColumn[] = [
    { field: 'txt_asistente', header: 'Asistente', sortable: true },
    { field: 'periodo', header: 'Período' },
    { field: 'estado', header: 'Estado', type: 'custom' },
    { field: 'cantidad_actividades', header: 'Actividades', type: 'number', align: 'center' },
    { field: 'cantidad_evidencias', header: 'Evidencias', type: 'number', align: 'center' }
  ];

  processedData = computed(() =>
    this.informes().map(i => ({
      ...i,
      periodo: `${this.formatDate(i.fec_periodoInicio)} - ${this.formatDate(i.fec_periodoFin)}`,
      estadoValor: i.ide_estadoInforme === 'PRESENTADO' ? 'Aprobado' : (i.ide_estadoInforme === 'GENERADO' ? 'Media' : 'Cerrado'),
      estadoText: this.getEstadoLabel(i.ide_estadoInforme)
    }))
  );

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);

    this.http.get<ResponseDto<Informe[]>>(`${environment.apiUrl}/informes`).subscribe({
      next: (res) => this.informes.set(res.datos ?? []),
      error: () => {
        console.error('Error cargando informes');
        this.alertService.toast('Error cargando informes', 'error');
      }
    });

    this.http.get<ResponseDto<Asistente[]>>(`${environment.apiUrl}/asistentes`).subscribe({
      next: (res) => this.asistentes.set(res.datos ?? []),
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
      fec_inicio: this.form.fec_periodoInicio
        ? new Date(this.form.fec_periodoInicio).toISOString()
        : null,
      fec_fin: this.form.fec_periodoFin
        ? new Date(this.form.fec_periodoFin).toISOString()
        : null
    };

    this.http.post<ResponseDto<unknown>>(`${environment.apiUrl}/informes/generar`, payload).subscribe({
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
    this.http.get<ResponseDto<InformeDetalle>>(`${environment.apiUrl}/informes/${informe.ide_informe}/detalle`).subscribe({
      next: (res) => {
        this.selectedDetalle.set(res.datos ?? null);
        this.showDetalleModal.set(true);
      },
      error: () => this.alertService.toast('Error al cargar detalle del informe', 'error')
    });
  }

  closeDetalleModal() {
    this.showDetalleModal.set(false);
    this.selectedDetalle.set(null);
  }

  formatDate(dateStr: string | null): string {
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

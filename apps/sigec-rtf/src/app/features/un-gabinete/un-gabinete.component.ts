import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RtfService, EvidenceDto } from '../../core/services/rtf.service';
import { ToastService } from '@agroideas/ui';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-un-gabinete',
  standalone: true,
  imports: [CommonModule, DecimalPipe, DatePipe],
  providers: [DecimalPipe, DatePipe],
  templateUrl: './un-gabinete.component.html',
})
export class UnGabineteComponent implements OnInit, OnDestroy {
  rtfService = inject(RtfService);
  private toast = inject(ToastService);
  private http = inject(HttpClient);
  private subs = new Subscription();

  // View state
  viewState = signal<'list' | 'audit'>('list');
  loadingBandeja = signal(false);
  loadingCompleto = signal(false);
  accionEjecutandose = signal(false);

  // UN signals
  unRtfList = this.rtfService.unRtfList;
  evidencias = signal<EvidenceDto[]>([]);
  anexo18 = signal<any>(null);

  // Devolver form
  showDevolverForm = signal(false);
  devolverObservacion = signal('');

  // R1 items for template display
  r1Items = computed(() => [
    { label: 'Actividades Realizadas', value: this.rtfService.txtActividadesRealizadas() },
    { label: 'Actividades No Realizadas', value: this.rtfService.txtActividadesNoRealizadas() },
    { label: 'Logros', value: this.rtfService.txtLogros() },
    { label: 'Dificultades', value: this.rtfService.txtDificultades() },
    { label: 'Cambios en el Paso', value: this.rtfService.txtCambiosPaso() },
  ]);

  anexo18Empty = computed(() => {
    const a = this.anexo18();
    return !a || Object.keys(a).length === 0;
  });

  ngOnInit() {
    this.cargarBandeja();
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  getFecRegistro(rtf: any) {
    return rtf.fecRegistro ?? null;
  }

  private cargarBandeja() {
    this.loadingBandeja.set(true);
    this.subs.add(
      this.rtfService.loadBandejaUn().subscribe({
        next: () => this.loadingBandeja.set(false),
        error: () => this.loadingBandeja.set(false)
      })
    );
  }

  seleccionarRtf(rtfId: number) {
    this.rtfService.unSelectedRtfId.set(rtfId);
    this.loadingCompleto.set(true);
    this.viewState.set('audit');
    this.showDevolverForm.set(false);
    this.devolverObservacion.set('');
    this.anexo18.set(null);

    this.subs.add(
      this.rtfService.loadRtfCompleto(rtfId).subscribe({
        next: (data) => {
          if (data) {
            this.evidencias.set(data.evidencias || []);
            this.cargarAnexo18(rtfId);
          }
          this.loadingCompleto.set(false);
        },
        error: () => {
          this.loadingCompleto.set(false);
          this.toast.error('Error al cargar el RTF completo');
        }
      })
    );
  }

  private cargarAnexo18(rtfId: number) {
    this.subs.add(
      this.http.get<any>(`${environment.apiUrl}/rtfs/${rtfId}/informe-comprobacion`).subscribe({
        next: (res: any) => {
          if (res?.datos) {
            this.anexo18.set(res.datos);
          }
        },
        error: () => {}
      })
    );
  }

  volverBandeja() {
    this.viewState.set('list');
    this.rtfService.unSelectedRtfId.set(null);
    this.cargarBandeja();
  }

  toggleDevolverForm() {
    this.showDevolverForm.update(v => !v);
    if (!this.showDevolverForm()) {
      this.devolverObservacion.set('');
    }
  }

  descargarEvidencia(ev: EvidenceDto) {
    if (!ev.ideEvidencia) return;
    this.subs.add(
      this.rtfService.downloadEvidencia(ev.ideEvidencia).subscribe({
        next: (blob: Blob) => {
          const url = URL.createObjectURL(blob);
          const a = window.document.createElement('a');
          a.href = url;
          a.download = ev.txtNombreArchivo || `evidencia_${ev.ideEvidencia}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
        },
        error: () => this.toast.error('Error', 'No se pudo descargar la evidencia.')
      })
    );
  }

  generarAnexo18() {
    const rtfId = this.rtfService.unSelectedRtfId();
    if (!rtfId) return;
    this.subs.add(
      this.http.get(`${environment.apiUrl}/rtfs/${rtfId}/documentos/anexo18`, { responseType: 'blob' }).subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const a = window.document.createElement('a');
          a.href = url;
          a.download = `Anexo18_RTF_${rtfId}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
        },
        error: () => this.toast.error('Error', 'No se pudo generar el Anexo 18')
      })
    );
  }

  aprobar() {
    const rtfId = this.rtfService.unSelectedRtfId();
    if (!rtfId) return;
    this.accionEjecutandose.set(true);

    this.subs.add(
      this.rtfService.aprobarUn(rtfId).subscribe({
        next: () => {
          this.toast.success('RTF aprobado exitosamente');
          this.accionEjecutandose.set(false);
          this.volverBandeja();
        },
        error: (err) => {
          this.toast.error(err.error?.mensaje || 'Error al aprobar RTF');
          this.accionEjecutandose.set(false);
        }
      })
    );
  }

  rechazar() {
    const rtfId = this.rtfService.unSelectedRtfId();
    if (!rtfId) return;
    this.accionEjecutandose.set(true);

    this.subs.add(
      this.rtfService.rechazarUn(rtfId).subscribe({
        next: () => {
          this.toast.success('RTF rechazado');
          this.accionEjecutandose.set(false);
          this.volverBandeja();
        },
        error: (err) => {
          this.toast.error(err.error?.mensaje || 'Error al rechazar RTF');
          this.accionEjecutandose.set(false);
        }
      })
    );
  }

  devolverRtf() {
    const rtfId = this.rtfService.unSelectedRtfId();
    if (!rtfId || !this.devolverObservacion().trim()) return;
    this.accionEjecutandose.set(true);

    this.subs.add(
      this.rtfService.devolverUn(rtfId, this.devolverObservacion()).subscribe({
        next: () => {
          this.toast.success('RTF devuelto a OA para correcci\u00F3n');
          this.accionEjecutandose.set(false);
          this.volverBandeja();
        },
        error: (err) => {
          this.toast.error(err.error?.mensaje || 'Error al devolver RTF');
          this.accionEjecutandose.set(false);
        }
      })
    );
  }
}

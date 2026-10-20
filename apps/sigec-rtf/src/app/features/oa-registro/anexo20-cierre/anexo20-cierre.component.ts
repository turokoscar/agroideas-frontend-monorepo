import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService, UIButtonComponent } from '@agroideas/ui';
import { mensajeParaUsuario } from '@agroideas/utils';
import { environment } from '../../../../environments/environment';
import { CierreService } from '../../../core/services/cierre.service';
import { RtfService } from '../../../core/services/rtf.service';
import { Anexo20Dto, EvidenceDto, TIPO_INFORME_CIERRE } from '../../../core/models';

/**
 * Informe de Cierre del PNT (Anexo 20) dentro del RTF del último paso crítico (ADR 0013 del monorepo,
 * Fase A). El formulario es de sigec-api-cierre (precargado con lo que ya está en el SEL); la API genera
 * el PDF/A oficial, la OA lo firma fuera del sistema y lo adjunta aquí como evidencia
 * `INFORME_CIERRE_PNT` del RTF. Al enviar el RTF, sigec-api-rtf avisa a Cierre, que toma ese PDF y abre
 * el expediente de cierre.
 */
@Component({
  selector: 'app-anexo20-cierre',
  standalone: true,
  imports: [CommonModule, FormsModule, UIButtonComponent],
  templateUrl: './anexo20-cierre.component.html'
})
export class Anexo20CierreComponent {
  private cierre = inject(CierreService);
  private rtfService = inject(RtfService);
  private toast = inject(ToastService);

  /** postulanteId de BD_SEL (el `ideConvenio` de Cierre). */
  ideConvenio = input.required<number | null>();
  /** RTF del último paso crítico; null si aún no se creó (no se puede adjuntar). */
  rtfId = input<number | null>(null);
  /** El RTF admite cambios (en edición u observado). */
  editable = input(true);
  /** PDF firmado del Anexo 20 que ya está adjunto al RTF. */
  adjuntos = input<EvidenceDto[]>([]);
  /** Se emite tras adjuntar el PDF firmado, para que el RTF recargue sus evidencias. */
  adjuntado = output<void>();

  readonly tamanoMaximoMb = environment.cierre.tamanoMaximoPdfMb;

  cargando = signal(false);
  error = signal<string | null>(null);
  guardando = signal(false);
  descargando = signal(false);
  subiendo = signal(false);
  sucio = signal(false);
  archivo = signal<File | null>(null);

  /** Copia editable del formulario; se reemplaza con la respuesta del servidor al guardar. */
  anexo = signal<Anexo20Dto | null>(null);

  presentado = computed(() => this.anexo()?.estAnexo20 === 'PRESENTADO');
  soloLectura = computed(() => !this.editable() || this.presentado());
  /** Guardado, sin faltantes y sin cambios pendientes: listo para generar el PDF. */
  completo = computed(() => {
    const anexo = this.anexo();
    return !!anexo && anexo.ideAnexo20 > 0 && anexo.faltantes.length === 0 && !this.sucio();
  });
  tieneAdjunto = computed(() => this.adjuntos().length > 0);

  constructor() {
    effect(() => {
      const ideConvenio = this.ideConvenio();
      if (ideConvenio) untracked(() => this.cargar(ideConvenio));
    });
  }

  cargar(ideConvenio = this.ideConvenio()) {
    if (!ideConvenio) return;
    this.cargando.set(true);
    this.error.set(null);
    this.cierre.obtenerAnexo20(ideConvenio).subscribe({
      next: anexo => {
        this.anexo.set(anexo);
        this.sucio.set(false);
        this.cargando.set(false);
      },
      error: err => {
        this.cargando.set(false);
        this.error.set(mensajeParaUsuario(err, 'No se pudo cargar el Anexo 20 desde el módulo de Cierre.'));
      }
    });
  }

  /** Avisa que hay cambios sin guardar: la descarga del PDF se bloquea hasta guardar. */
  marcarSucio() {
    this.sucio.set(true);
  }

  agregarMeta() {
    this.mutar(a => a.metas.push({ numOrden: a.metas.length + 1, txtObjetivoEspecifico: '', txtIndicador: '', txtLogradoAnio3: '', txtComentarios: null }));
  }

  quitarMeta(indice: number) {
    this.mutar(a => a.metas.splice(indice, 1));
  }

  agregarProducto() {
    this.mutar(a =>
      a.comercializacion.push({
        numOrden: a.comercializacion.length + 1,
        txtProducto: '',
        txtDestino: '',
        txtUnidadMedida: '',
        canComercializada: 0,
        impPrecioVenta: 0,
        impTotalIngreso: 0
      })
    );
  }

  quitarProducto(indice: number) {
    this.mutar(a => a.comercializacion.splice(indice, 1));
  }

  guardar() {
    const ideConvenio = this.ideConvenio();
    const anexo = this.anexo();
    if (!ideConvenio || !anexo) return;
    this.guardando.set(true);
    this.cierre.guardarAnexo20(ideConvenio, anexo).subscribe({
      next: guardado => {
        this.anexo.set(guardado);
        this.sucio.set(false);
        this.guardando.set(false);
        if (guardado.faltantes.length === 0) {
          this.toast.success('Anexo 20 guardado', 'Ya puede descargar el documento para firmarlo.');
        } else {
          this.toast.info('Borrador guardado', `Aún falta: ${guardado.faltantes.join('; ')}.`);
        }
      },
      error: err => {
        this.guardando.set(false);
        this.toast.error('No se pudo guardar el Anexo 20', mensajeParaUsuario(err, 'Intente nuevamente.'));
      }
    });
  }

  descargar() {
    const ideConvenio = this.ideConvenio();
    if (!ideConvenio) return;
    this.descargando.set(true);
    this.cierre.descargarAnexo20(ideConvenio).subscribe({
      next: blob => {
        this.descargando.set(false);
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `Anexo20_${this.anexo()?.txtNumeroConvenio ?? ideConvenio}.pdf`;
        enlace.click();
        URL.revokeObjectURL(url);
      },
      error: err => {
        this.descargando.set(false);
        this.toast.error('No se pudo generar el documento', mensajeParaUsuario(err, 'Intente nuevamente.'));
      }
    });
  }

  seleccionarArchivo(event: Event) {
    const entrada = event.target as HTMLInputElement;
    const archivo = entrada.files?.[0];
    entrada.value = '';
    if (!archivo) return;
    if (archivo.type !== 'application/pdf') {
      this.toast.error('Formato no permitido', 'Adjunte el Anexo 20 firmado en PDF.');
      return;
    }
    if (archivo.size > this.tamanoMaximoMb * 1024 * 1024) {
      this.toast.error('Archivo muy grande', `El PDF no debe superar los ${this.tamanoMaximoMb} MB.`);
      return;
    }
    this.archivo.set(archivo);
  }

  adjuntar() {
    const rtfId = this.rtfId();
    const archivo = this.archivo();
    if (!rtfId || !archivo) return;
    this.subiendo.set(true);
    this.rtfService.uploadEvidencia(rtfId, 0, TIPO_INFORME_CIERRE, archivo).subscribe({
      next: () => {
        this.subiendo.set(false);
        this.archivo.set(null);
        this.toast.success('Anexo 20 adjuntado', 'Se enviará a Cierre de Convenio junto con este RTF.');
        this.adjuntado.emit();
      },
      error: err => {
        this.subiendo.set(false);
        this.toast.error('No se pudo adjuntar el Anexo 20', mensajeParaUsuario(err, 'Intente nuevamente.'));
      }
    });
  }

  private mutar(cambio: (anexo: Anexo20Dto) => void) {
    const anexo = this.anexo();
    if (!anexo) return;
    const copia: Anexo20Dto = { ...anexo, metas: [...anexo.metas], comercializacion: [...anexo.comercializacion] };
    cambio(copia);
    copia.metas.forEach((m, i) => (m.numOrden = i + 1));
    copia.comercializacion.forEach((c, i) => (c.numOrden = i + 1));
    this.anexo.set(copia);
    this.marcarSucio();
  }
}

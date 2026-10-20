import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { DatePipe, DecimalPipe, NgClass, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService, UIButtonComponent, UIModalComponent, UiFileChipComponent } from '@agroideas/ui';
import { mensajeParaUsuario } from '@agroideas/utils';
import { environment } from '../../../../environments/environment';
import { CierreApiService } from '../../../core/services/cierre-api.service';
import {
  Anexo22Dto,
  ETIQUETA_ORIGEN_DATO,
  RESULTADOS,
  SeccionManual,
  VersionAnexo22Dto,
  nuevoIndicador,
  tieneDesviacionCritica
} from '../../../core/models/anexo22.model';
import { PlazoDto, diasRestantes } from '../../../core/models/plazo.model';
import { TablaIndicadoresComponent } from './tabla-indicadores.component';

/**
 * Informe de Evaluación de la Ejecución del PNT para Cierre (Anexo 22) y derivación a la DE, ADR 0013 Fase 3.
 * Lo elabora la UN con el expediente en `EN_EVALUACION_UN`: viene precargado (SEL, RTF y KOFIX, ADR-003) y la UN
 * escribe los análisis, las filas manuales, la contrapartida, VII a XI y el resultado. Se descarga el PDF, se
 * firma fuera del sistema y se presenta; firmado, el expediente se eleva a la DE (con contingencia si venció el
 * plazo de la UN).
 */
@Component({
  selector: 'app-informe-evaluacion',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    NgClass,
    NgTemplateOutlet,
    FormsModule,
    UIButtonComponent,
    UIModalComponent,
    UiFileChipComponent,
    TablaIndicadoresComponent
  ],
  templateUrl: './informe-evaluacion.component.html'
})
export class InformeEvaluacionComponent {
  private api = inject(CierreApiService);
  private toast = inject(ToastService);

  ideCierre = input.required<number>();
  /** Plazo de la evaluación de la UN (90 días): si venció, la derivación exige contingencia. */
  plazoUn = input<PlazoDto | null>(null);
  /** Se emite cuando el expediente cambió (Anexo 22 presentado o expediente derivado). */
  cambio = output<void>();

  readonly resultados = RESULTADOS;
  readonly tamanoMaximoMb = environment.archivos.tamanoMaximoPdfMb;
  readonly umbral = environment.evaluacion.umbralDesviacionCriticaPct;

  cargando = signal(false);
  error = signal<string | null>(null);
  guardando = signal(false);
  descargando = signal(false);
  presentando = signal(false);
  derivando = signal(false);
  confirmarPresentar = signal(false);
  modalDerivar = signal(false);
  sucio = signal(false);
  archivo = signal<File | null>(null);
  contingencia = '';
  anexo = signal<Anexo22Dto | null>(null);
  versiones = signal<VersionAnexo22Dto[]>([]);

  firmado = computed(() => this.anexo()?.estAnexo22 === 'FIRMADO');
  guardado = computed(() => (this.anexo()?.ideAnexo22 ?? 0) > 0);
  completo = computed(() => this.guardado() && (this.anexo()?.faltantes.length ?? 1) === 0 && !this.sucio());
  plazoVencido = computed(() => {
    const plazo = this.plazoUn();
    return !!plazo && plazo.estPlazo !== 'CUMPLIDO' && diasRestantes(plazo.fecLimite) < 0;
  });
  /** Indicadores con desviación crítica en algún año, para el aviso de la cabecera. */
  criticos = computed(() => {
    const a = this.anexo();
    if (!a) return 0;
    return [...a.produccion, ...a.precios, ...a.comercializacion, ...a.ingresos, ...a.objetivosEspecificos, ...a.practicaAmbiental]
      .filter(tieneDesviacionCritica).length;
  });

  constructor() {
    effect(() => {
      const id = this.ideCierre();
      untracked(() => this.cargar(id));
    });
  }

  cargar(id = this.ideCierre()) {
    this.cargando.set(true);
    this.error.set(null);
    this.api.obtenerAnexo22(id).subscribe({
      next: anexo => {
        this.anexo.set(anexo);
        this.sucio.set(false);
        this.cargando.set(false);
      },
      error: err => {
        this.cargando.set(false);
        this.error.set(mensajeParaUsuario(err, 'No se pudo cargar el Informe de Evaluación.'));
      }
    });
    this.api.listarVersionesAnexo22(id).subscribe({ next: v => this.versiones.set(v), error: () => this.versiones.set([]) });
  }

  marcarSucio() {
    this.sucio.set(true);
  }

  agregarFila(seccion: SeccionManual) {
    this.mutar(a => a[seccion].push(nuevoIndicador(a[seccion].length + 1)));
  }

  quitarFila(seccion: SeccionManual, indice: number) {
    this.mutar(a => a[seccion].splice(indice, 1));
  }

  readonly etiquetaOrigen = (origen: string) => ETIQUETA_ORIGEN_DATO[origen] ?? origen;

  pctEjecucion(aprobado: number, ejecutado: number): number | null {
    return aprobado > 0 ? Math.round((ejecutado / aprobado) * 10000) / 100 : null;
  }

  guardar() {
    const anexo = this.anexo();
    if (!anexo) return;
    this.guardando.set(true);
    this.api.guardarAnexo22(this.ideCierre(), anexo).subscribe({
      next: guardado => {
        this.anexo.set(guardado);
        this.sucio.set(false);
        this.guardando.set(false);
        if (guardado.faltantes.length === 0) {
          this.toast.success('Informe guardado', 'Descárguelo para firmarlo y preséntelo firmado.');
        } else {
          this.toast.info('Borrador guardado', `Aún falta: ${guardado.faltantes.join('; ')}.`);
        }
      },
      error: err => {
        this.guardando.set(false);
        this.toast.error('No se pudo guardar el informe', mensajeParaUsuario(err, 'Intente nuevamente.'));
      }
    });
  }

  descargar() {
    this.descargando.set(true);
    this.api.descargarAnexo22(this.ideCierre()).subscribe({
      next: blob => {
        this.descargando.set(false);
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `Anexo22_${this.anexo()?.txtNumeroConvenio ?? this.ideCierre()}_v${this.anexo()?.numVersion ?? 1}.pdf`;
        enlace.click();
        URL.revokeObjectURL(url);
      },
      error: err => {
        this.descargando.set(false);
        this.toast.error('No se pudo generar el informe', mensajeParaUsuario(err, 'Intente nuevamente.'));
      }
    });
  }

  seleccionarArchivo(event: Event) {
    const entrada = event.target as HTMLInputElement;
    const archivo = entrada.files?.[0];
    entrada.value = '';
    if (!archivo) return;
    if (archivo.type !== 'application/pdf') {
      this.toast.error('Formato no permitido', 'Adjunte el Informe de Evaluación firmado en PDF.');
      return;
    }
    if (archivo.size > this.tamanoMaximoMb * 1024 * 1024) {
      this.toast.error('Archivo muy grande', `El PDF no debe superar los ${this.tamanoMaximoMb} MB.`);
      return;
    }
    this.archivo.set(archivo);
  }

  presentar() {
    const archivo = this.archivo();
    if (!archivo || !this.completo()) return;
    this.presentando.set(true);
    this.api.presentarAnexo22(this.ideCierre(), archivo).subscribe({
      next: () => {
        this.presentando.set(false);
        this.confirmarPresentar.set(false);
        this.archivo.set(null);
        this.toast.success('Informe presentado', 'Ya puede elevar el expediente a la Dirección Ejecutiva.');
        this.cargar();
        this.cambio.emit();
      },
      error: err => {
        this.presentando.set(false);
        this.confirmarPresentar.set(false);
        this.toast.error('No se pudo presentar el informe', mensajeParaUsuario(err, 'Intente nuevamente.'));
      }
    });
  }

  abrirDerivar() {
    this.contingencia = '';
    this.modalDerivar.set(true);
  }

  derivar() {
    if (this.plazoVencido() && !this.contingencia.trim()) return;
    this.derivando.set(true);
    this.api.derivar(this.ideCierre(), 'DE', this.plazoVencido() ? this.contingencia.trim() : null).subscribe({
      next: () => {
        this.derivando.set(false);
        this.modalDerivar.set(false);
        this.toast.success('Expediente elevado', 'El Expediente Único pasó a la Dirección Ejecutiva.');
        this.cambio.emit();
      },
      error: err => {
        this.derivando.set(false);
        this.toast.error('No se pudo elevar el expediente', mensajeParaUsuario(err, 'Intente nuevamente.'));
      }
    });
  }

  private mutar(cambio: (anexo: Anexo22Dto) => void) {
    const anexo = this.anexo();
    if (!anexo) return;
    const copia: Anexo22Dto = {
      ...anexo,
      precios: [...anexo.precios],
      comercializacion: [...anexo.comercializacion],
      ingresos: [...anexo.ingresos],
      objetivosEspecificos: [...anexo.objetivosEspecificos]
    };
    cambio(copia);
    for (const lista of [copia.precios, copia.comercializacion, copia.ingresos, copia.objetivosEspecificos]) {
      lista.forEach((fila, i) => (fila.numOrden = i + 1));
    }
    this.anexo.set(copia);
    this.marcarSucio();
  }
}

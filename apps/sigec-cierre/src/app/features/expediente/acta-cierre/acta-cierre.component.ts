import { Component, Injector, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService, UIButtonComponent, UIModalComponent, UiStateComponent } from '@agroideas/ui';
import { FormatConvenioPipe, formatConvenioNumber, mensajeParaUsuario } from '@agroideas/utils';
import { CierreApiService } from '../../../core/services/cierre-api.service';
import { Anexo21Dto, ItemVerificadoDto, PATRON_DOCUMENTO } from '../../../core/models/anexo21.model';
import { SelectorPdfComponent } from '../../../shared/selector-pdf.component';
import { CampoInvalidoDirective } from '../../../shared/campo-invalido.directive';
import { ErrorCampoComponent } from '../../../shared/error-campo.component';
import { erroresBloqueantesActa, faltantesActa } from '../../../core/models/validacion-acta';
import { ValidacionFormulario } from '../../../shared/validacion-formulario';

type ListaItems = 'bienes' | 'servicios';

/** Bien o servicio no programado que se agrega desde el modal (el resto de la fila son referencias de KOFIX). */
interface NuevoItem {
  lista: ListaItems;
  txtDescripcion: string;
  txtUnidadMedida: string;
  canCantidad: number | null;
  txtObservaciones: string;
}

/**
 * Verificación de campo y Acta de Cierre (Anexo 21), ADR 0013 Fase 2. La llenan la UR o la UN con el
 * expediente en `EN_VERIFICACION`: el formulario viene precargado (organización, PNT y convenio del SEL;
 * bienes y servicios programados con su ejecución en KOFIX; objetivos del Anexo 20). Se imprime, los
 * asistentes lo firman a mano y se registra el acta escaneada: el expediente pasa a la evaluación de la UN.
 */
@Component({
  selector: 'app-acta-cierre',
  standalone: true,
  host: { class: 'block' },
  imports: [
    CommonModule,
    FormsModule,
    UIButtonComponent,
    UIModalComponent,
    FormatConvenioPipe,
    SelectorPdfComponent,
    UiStateComponent,
    CampoInvalidoDirective,
    ErrorCampoComponent
  ],
  templateUrl: './acta-cierre.component.html'
})
export class ActaCierreComponent {
  private api = inject(CierreApiService);
  private toast = inject(ToastService);

  ideCierre = input.required<number>();
  /** Nombre del usuario, para proponerlo como profesional de AGROIDEAS si el acta no tiene uno. */
  nombreUsuario = input<string | null>(null);
  /** Se emite al registrar la verificación: el expediente cambió de estado. */
  registrado = output<void>();

  readonly patronDocumento = PATRON_DOCUMENTO.source;

  cargando = signal(false);
  error = signal<string | null>(null);
  guardando = signal(false);
  descargando = signal(false);
  registrando = signal(false);
  confirmar = signal(false);
  sucio = signal(false);
  archivo = signal<File | null>(null);
  acta = signal<Anexo21Dto | null>(null);
  /** Bien o servicio que se está agregando en el modal; null si está cerrado. */
  nuevoItem = signal<NuevoItem | null>(null);
  /** Los errores del modal se muestran recién al intentar agregar, como en el resto del acta. */
  intentoItem = signal(false);

  guardada = computed(() => (this.acta()?.ideAnexo21 ?? 0) > 0);
  completa = computed(() => this.guardada() && (this.acta()?.faltantes.length ?? 1) === 0 && !this.sucio());
  puedeRegistrar = computed(() => this.completa() && !!this.archivo() && !this.registrando());

  /** Validación por campo (ADR 0014, Fase 5): reglas en `validacion-acta.ts`. */
  readonly validacion = new ValidacionFormulario(inject(Injector), {
    bloqueantes: () => {
      const a = this.acta();
      return a ? erroresBloqueantesActa(a) : [];
    },
    faltantes: () => {
      const a = this.acta();
      return a ? faltantesActa(a) : [];
    }
  });

  /** Mensaje de error del control `id`, o null (para la plantilla). */
  errorDe(id: string): string | null {
    return this.validacion.error(id);
  }

  constructor() {
    effect(() => {
      const id = this.ideCierre();
      untracked(() => this.cargar(id));
    });
  }

  cargar(id = this.ideCierre()) {
    this.cargando.set(true);
    this.error.set(null);
    this.api.obtenerAnexo21(id).subscribe({
      next: acta => {
        if (!acta.txtProfesionalAgroideas && this.nombreUsuario()) {
          acta = { ...acta, txtProfesionalAgroideas: this.nombreUsuario() };
        }
        this.acta.set(acta);
        this.sucio.set(false);
        this.cargando.set(false);
      },
      error: err => {
        this.cargando.set(false);
        this.error.set(mensajeParaUsuario(err, 'No se pudo cargar el Acta de Cierre.'));
      }
    });
  }

  marcarSucio() {
    this.sucio.set(true);
    this.validacion.tocar();
  }

  /** Hora de firma (HH:mm): el acta dice "siendo las … horas del mismo día", así que la fecha es la del inicio. */
  horaFirma(): string {
    return this.acta()?.fecFinReunion?.slice(11, 16) ?? '';
  }

  cambiarHoraFirma(hora: string) {
    const acta = this.acta();
    if (!acta) return;
    const dia = acta.fecInicioReunion?.slice(0, 10);
    acta.fecFinReunion = hora && dia ? `${dia}T${hora}` : null;
    this.marcarSucio();
  }

  /** Al cambiar el inicio, la firma se mueve al mismo día conservando su hora. */
  cambiarInicio(inicio: string | null) {
    const acta = this.acta();
    if (!acta) return;
    acta.fecInicioReunion = inicio || null;
    const hora = this.horaFirma();
    acta.fecFinReunion = hora && acta.fecInicioReunion ? `${acta.fecInicioReunion.slice(0, 10)}T${hora}` : acta.fecFinReunion;
    this.marcarSucio();
  }

  /** La cantidad verificada difiere de lo ejecutado según KOFIX: se resalta para que se observe. */
  difiere(item: ItemVerificadoDto): boolean {
    return item.canEjecutada !== null && Number(item.canCantidad) !== Number(item.canEjecutada);
  }

  abrirItem(lista: ListaItems) {
    this.intentoItem.set(false);
    this.nuevoItem.set({ lista, txtDescripcion: '', txtUnidadMedida: '', canCantidad: null, txtObservaciones: '' });
  }

  /** Errores del modal de ítem por control (método: el formulario se edita mutando la copia). */
  erroresItem(): Partial<Record<'item-descripcion' | 'item-unidad' | 'item-cantidad', string>> {
    const n = this.nuevoItem();
    if (!n) return {};
    const errores: Partial<Record<'item-descripcion' | 'item-unidad' | 'item-cantidad', string>> = {};
    if (!n.txtDescripcion.trim()) errores['item-descripcion'] = 'Indique la descripción.';
    if (!n.txtUnidadMedida.trim()) errores['item-unidad'] = 'Indique la unidad de medida.';
    if (n.canCantidad === null || `${n.canCantidad}` === '') errores['item-cantidad'] = 'Indique la cantidad verificada.';
    else if (Number(n.canCantidad) < 0) errores['item-cantidad'] = 'La cantidad no puede ser negativa.';
    return errores;
  }

  /** Mensaje de error del control `id` del modal, o null mientras no se intente agregar. */
  errorItem(id: 'item-descripcion' | 'item-unidad' | 'item-cantidad'): string | null {
    return this.intentoItem() ? (this.erroresItem()[id] ?? null) : null;
  }

  agregarItem() {
    const n = this.nuevoItem();
    if (!n) return;
    const primero = Object.keys(this.erroresItem())[0];
    if (primero) {
      this.intentoItem.set(true);
      document.getElementById(primero)?.focus();
      return;
    }
    this.mutar(a =>
      a[n.lista].push({
        numOrden: a[n.lista].length + 1,
        txtDescripcion: n.txtDescripcion.trim(),
        txtUnidadMedida: n.txtUnidadMedida.trim(),
        canCantidad: Number(n.canCantidad),
        txtObservaciones: n.txtObservaciones.trim() || null,
        ideItemSel: null,
        canProgramada: null,
        canEjecutada: null,
        impEjecutado: null
      })
    );
    this.nuevoItem.set(null);
  }

  quitarItem(lista: ListaItems, indice: number) {
    this.mutar(a => a[lista].splice(indice, 1));
  }

  agregarLogro() {
    this.mutar(a => a.logros.push({ numOrden: a.logros.length + 1, txtObjetivoEspecifico: '', txtLogroAlcanzado: '' }));
  }

  quitarLogro(indice: number) {
    this.mutar(a => a.logros.splice(indice, 1));
  }

  agregarAsistente() {
    this.mutar(a => a.asistentes.push({ numOrden: a.asistentes.length + 1, txtNombres: '', txtCargo: '', codDni: '' }));
  }

  quitarAsistente(indice: number) {
    this.mutar(a => a.asistentes.splice(indice, 1));
  }

  guardar() {
    const acta = this.acta();
    if (!acta) return;
    this.validacion.mostrar.set(true);
    const bloqueantes = this.validacion.bloqueantes();
    if (bloqueantes.length) {
      this.toast.error('Corrija los campos marcados', `${bloqueantes.length === 1 ? 'Un campo impide' : `${bloqueantes.length} campos impiden`} guardar el acta.`);
      this.validacion.enfocar(bloqueantes[0].id);
      return;
    }
    this.guardando.set(true);
    this.api.guardarAnexo21(this.ideCierre(), acta).subscribe({
      next: guardada => {
        this.acta.set(guardada);
        this.sucio.set(false);
        this.guardando.set(false);
        if (guardada.faltantes.length === 0) {
          this.toast.success('Acta guardada', 'Imprímala para la firma y registre luego el acta escaneada.');
        } else {
          this.toast.info('Borrador guardado', 'Los campos marcados en rojo faltan para registrar la verificación.');
        }
      },
      error: err => {
        this.guardando.set(false);
        this.toast.error('No se pudo guardar el acta', mensajeParaUsuario(err, 'Intente nuevamente.'));
      }
    });
  }

  descargar() {
    this.descargando.set(true);
    this.api.descargarAnexo21(this.ideCierre()).subscribe({
      next: blob => {
        this.descargando.set(false);
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        const a = this.acta();
        enlace.download = `Anexo21_${a?.txtNumeroConvenio ? formatConvenioNumber(a.txtNumeroConvenio, a.fecFirmaConvenio) : this.ideCierre()}.pdf`;
        enlace.click();
        URL.revokeObjectURL(url);
      },
      error: err => {
        this.descargando.set(false);
        this.toast.error('No se pudo generar el acta', mensajeParaUsuario(err, 'Intente nuevamente.'));
      }
    });
  }

  registrar() {
    const archivo = this.archivo();
    if (!archivo || !this.completa()) return;
    this.registrando.set(true);
    this.api.registrarVerificacion(this.ideCierre(), archivo).subscribe({
      next: () => {
        this.registrando.set(false);
        this.confirmar.set(false);
        this.archivo.set(null);
        this.toast.success('Verificación registrada', 'El expediente pasa a la evaluación de la Unidad de Negocios.');
        this.registrado.emit();
      },
      error: err => {
        this.registrando.set(false);
        this.confirmar.set(false);
        this.toast.error('No se pudo registrar la verificación', mensajeParaUsuario(err, 'Intente nuevamente.'));
      }
    });
  }

  private mutar(cambio: (acta: Anexo21Dto) => void) {
    const acta = this.acta();
    if (!acta) return;
    const copia: Anexo21Dto = {
      ...acta,
      bienes: [...acta.bienes],
      servicios: [...acta.servicios],
      logros: [...acta.logros],
      asistentes: [...acta.asistentes]
    };
    cambio(copia);
    for (const lista of [copia.bienes, copia.servicios, copia.logros, copia.asistentes]) {
      lista.forEach((fila, i) => (fila.numOrden = i + 1));
    }
    this.acta.set(copia);
    this.marcarSucio();
  }
}

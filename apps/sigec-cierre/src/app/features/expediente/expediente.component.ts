import { Component, OnDestroy, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable, forkJoin } from 'rxjs';
import { UIButtonComponent, UiCountdownRingComponent, ToastService } from '@agroideas/ui';
import { UiPdfViewerComponent } from '@agroideas/ui/pdf-viewer';
import { FormatConvenioPipe, mensajeParaUsuario } from '@agroideas/utils';
import { CierreApiService } from '../../core/services/cierre-api.service';
import { AuthService } from '../../core/services/auth.service';
import {
  AuditoriaCierreDto,
  CierreDetalleDto,
  DocumentoCierreDto,
  ETIQUETA_ORIGEN,
  etiquetaDocumento
} from '../../core/models/cierre.model';
import { ETIQUETA_ESTADO_PLAZO, PlazoDto, diasRestantes, etiquetaTipoPlazo } from '../../core/models/plazo.model';
import { EnvioNotificacionDto } from '../../core/models/notificacion.model';
import { EtapaCierre, construirEtapas } from '../../core/models/etapas-cierre';
import { ROLES_PERSONAL, tieneAlgunRol } from '../../core/models/rol-cierre.model';
import { EstadoCierrePillComponent } from '../../shared/estado-cierre-pill.component';
import { AccionCierre, puedeEjecutar } from '../../core/models/acciones-cierre';
import { ActaCierreComponent } from './acta-cierre/acta-cierre.component';
import { InformeEvaluacionComponent } from './informe-evaluacion/informe-evaluacion.component';
import { PresentacionAnexo20Component } from './anexo20/presentacion-anexo20.component';
import { TrasladoUajComponent } from './revision-legal/traslado-uaj.component';
import { RevisionUajComponent } from './revision-legal/revision-uaj.component';
import { SubsanacionComponent } from './revision-legal/subsanacion.component';
import { SuscripcionRdeComponent } from './revision-legal/suscripcion-rde.component';
import { CargoNotificacionComponent } from './revision-legal/cargo-notificacion.component';
import { ObservacionUajDto, agruparPorRonda, ultimaRonda } from '../../core/models/revision-legal.model';

type Pestana = 'documentos' | 'plazos' | 'bitacora' | 'envios' | 'observaciones';

/**
 * Vista única del expediente para todos los roles (ADR 0013, D3): cabecera, stepper de seis
 * etapas, una tarjeta por etapa y pestañas de documentos, plazos, bitácora y correos enviados.
 * En la Fase 1 es de solo lectura; las fases siguientes agregan la acción de cada etapa activa.
 * Se usa como página (`/expedientes/:id`, con el `id` de la ruta) y dentro de `mi-cierre`.
 */
@Component({
  selector: 'app-expediente',
  standalone: true,
  imports: [DatePipe, NgClass, RouterLink, FormatConvenioPipe, UIButtonComponent, UiCountdownRingComponent, UiPdfViewerComponent, EstadoCierrePillComponent,
    ActaCierreComponent,
    InformeEvaluacionComponent,
    PresentacionAnexo20Component,
    TrasladoUajComponent,
    RevisionUajComponent,
    SubsanacionComponent,
    SuscripcionRdeComponent,
    CargoNotificacionComponent
  ],
  templateUrl: './expediente.component.html'
})
export class ExpedienteComponent implements OnDestroy {
  private api = inject(CierreApiService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  /** `ideCierreConvenio`; llega del parámetro `:id` de la ruta o del componente padre. */
  id = input.required<string | number>();
  /** Muestra el enlace "Volver a la bandeja" (no aplica dentro de `mi-cierre`). */
  mostrarVolver = input(true);

  cargando = signal(true);
  error = signal<string | null>(null);
  cierre = signal<CierreDetalleDto | null>(null);
  plazos = signal<PlazoDto[]>([]);
  pestana = signal<Pestana>('documentos');

  auditorias = signal<AuditoriaCierreDto[] | null>(null);
  envios = signal<EnvioNotificacionDto[] | null>(null);
  /** Observaciones de la UAJ de todas las rondas (solo personal: la API responde 403 a la OA). */
  observaciones = signal<ObservacionUajDto[]>([]);
  rondas = computed(() => agruparPorRonda(this.observaciones()));
  reintentandoSel = signal(false);
  cargandoPestana = signal(false);

  visor = signal<{ abierto: boolean; nombre: string | null; url: string | null }>({ abierto: false, nombre: null, url: null });

  esPersonal = computed(() => tieneAlgunRol(this.auth.roles(), ROLES_PERSONAL));
  nombreUsuario = computed(() => this.auth.user()?.nombre ?? null);

  /** El usuario puede ejecutar esa acción en el estado actual (espejo de la máquina de estados). */
  puede(accion: AccionCierre): boolean {
    const cierre = this.cierre();
    return !!cierre && puedeEjecutar(accion, cierre.estCierre, this.auth.roles());
  }
  etapas = computed<EtapaCierre[]>(() => {
    const cierre = this.cierre();
    return cierre ? construirEtapas(cierre, this.plazos(), ultimaRonda(this.observaciones())) : [];
  });
  origen = computed(() => {
    const tipo = this.cierre()?.tipOrigen;
    return tipo ? ETIQUETA_ORIGEN[tipo] ?? tipo : null;
  });

  readonly etiquetaDocumento = etiquetaDocumento;
  readonly etiquetaTipoPlazo = etiquetaTipoPlazo;
  readonly etiquetaEstadoPlazo = (estado: string) => ETIQUETA_ESTADO_PLAZO[estado as keyof typeof ETIQUETA_ESTADO_PLAZO] ?? estado;

  constructor() {
    effect(() => {
      const id = Number(this.id());
      untracked(() => this.cargar(id));
    });
  }

  ngOnDestroy() {
    this.liberarVisor();
  }

  cargar(id = Number(this.id())) {
    this.cargando.set(true);
    this.error.set(null);
    this.auditorias.set(null);
    this.envios.set(null);
    if (this.esPersonal()) {
      this.api.listarObservaciones(id).subscribe({ next: o => this.observaciones.set(o), error: () => this.observaciones.set([]) });
    }
    forkJoin({ cierre: this.api.obtener(id), plazos: this.api.listarPlazos(id) }).subscribe({
      next: ({ cierre, plazos }) => {
        this.cierre.set(cierre);
        this.plazos.set(plazos);
        this.cargando.set(false);
      },
      error: err => {
        this.error.set(mensajeParaUsuario(err, 'No se pudo cargar el expediente de cierre.'));
        this.cargando.set(false);
      }
    });
  }

  /** Hay un cargo de notificación de la RDE vigente. */
  tieneCargo = computed(() => this.cierre()?.documentos.some(d => d.tipDocumento === 'CARGO_NOTIFICACION_RDE') ?? false);
  /** La DE puede reintentar el estado 77 si el cierre quedó sin sincronizar con el SEL. */
  puedeReintentarSel = computed(() => {
    const c = this.cierre();
    return !!c && c.estCierre === 'CERRADO' && c.flgSelSincronizado === false && this.auth.roles().includes('DE');
  });

  reintentarSel() {
    const c = this.cierre();
    if (!c) return;
    this.reintentandoSel.set(true);
    this.api.reintentarSincronizacionSel(c.ideCierreConvenio).subscribe({
      next: () => {
        this.reintentandoSel.set(false);
        this.toast.success('Estado 77 registrado', 'El convenio figura como cerrado en el SEL.');
        this.cargar();
      },
      error: err => {
        this.reintentandoSel.set(false);
        this.toast.error('No se pudo registrar el estado 77', mensajeParaUsuario(err, 'Se seguirá reintentando automáticamente.'));
        this.cargar();
      }
    });
  }

  cambiarPestana(pestana: Pestana) {
    this.pestana.set(pestana);
    const id = Number(this.id());
    if (pestana === 'bitacora' && this.auditorias() === null) {
      this.cargarPestana(this.api.listarAuditorias(id), items => this.auditorias.set(items), 'la bitácora');
    }
    if (pestana === 'envios' && this.envios() === null) {
      this.cargarPestana(this.api.listarEnvios(id), items => this.envios.set(items), 'los correos enviados');
    }
  }

  private cargarPestana<T>(fuente: Observable<T[]>, guardar: (items: T[]) => void, que: string) {
    this.cargandoPestana.set(true);
    fuente.subscribe({
      next: items => {
        guardar(items);
        this.cargandoPestana.set(false);
      },
      error: (err: unknown) => {
        guardar([]);
        this.cargandoPestana.set(false);
        this.toast.error(`No se pudo cargar ${que}`, mensajeParaUsuario(err, 'Intente nuevamente.'));
      }
    });
  }

  /** Días del anillo: transcurridos sobre el total del plazo (negativo si venció). */
  restantes(plazo: PlazoDto): number {
    return diasRestantes(plazo.fecLimite);
  }

  /** El plazo aún no empieza (p. ej. el del Anexo 20 corre desde el fin de la vigencia del convenio). */
  aunNoCorre(plazo: PlazoDto): boolean {
    return this.restantes(plazo) > plazo.canDias;
  }

  transcurridos(plazo: PlazoDto): number {
    return Math.max(0, plazo.canDias - Math.max(0, this.restantes(plazo)));
  }

  verDocumento(documento: DocumentoCierreDto) {
    this.api.descargarDocumento(documento.ideCierreConvenio, documento.tipDocumento).subscribe({
      next: blob => this.abrirVisor(documento.txtNombreArchivo, blob),
      error: () => this.toast.error('No se pudo abrir el documento', etiquetaDocumento(documento.tipDocumento))
    });
  }

  abrirVisor(nombre: string, blob: Blob) {
    this.liberarVisor();
    this.visor.set({ abierto: true, nombre, url: URL.createObjectURL(blob) });
  }

  cerrarVisor(abierto: boolean) {
    if (!abierto) {
      this.liberarVisor();
      this.visor.set({ abierto: false, nombre: null, url: null });
    }
  }

  private liberarVisor() {
    const url = this.visor().url;
    if (url) URL.revokeObjectURL(url);
  }
}

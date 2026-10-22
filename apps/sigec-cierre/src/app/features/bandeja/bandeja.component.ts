import { Component, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  TableColumn,
  ToastService,
  UIButtonComponent,
  UIModalComponent,
  UiAutocompleteComponent,
  UiDataTableComponent,
  KpiVariant,
  UiFilterBarComponent,
  UiKpiComponent,
  UiPaginationComponent
} from '@agroideas/ui';
import { FormatConvenioPipe, formatConvenioNumber, mensajeParaUsuario } from '@agroideas/utils';
import { environment } from '../../../environments/environment';
import { CierreApiService } from '../../core/services/cierre-api.service';
import { AuthService } from '../../core/services/auth.service';
import { ConvenioSelDto, ConvenioSelService, buscaEnCartera } from '../../core/services/convenio-sel.service';
import { AvisoCalendarioComponent } from '../../shared/aviso-calendario.component';
import {
  CierreDto,
  ESTADOS_CIERRE,
  ETIQUETA_SEMAFORO,
  EstadoCierre,
  ExpedientePendienteDto,
  SEMAFOROS,
  SemaforoPlazo,
  claseSemaforo,
  etiquetaAccion,
  etiquetaEstado
} from '../../core/models/cierre.model';
import { etiquetaTipoPlazo } from '../../core/models/plazo.model';
import { tieneAlgunRol } from '../../core/models/rol-cierre.model';
import { EstadoCierrePillComponent } from '../../shared/estado-cierre-pill.component';

export type PestanaBandeja = SemaforoPlazo | 'TODOS';

/** Primera pestaña con expedientes, en orden de urgencia; si la bandeja está vacía, "Todos". */
export function pestanaInicial(conteo: Readonly<Record<SemaforoPlazo, number>>): PestanaBandeja {
  return SEMAFOROS.find(s => conteo[s] > 0) ?? 'TODOS';
}

/** Busca por número de convenio (tal como se muestra, "0048-2023-ST"), organización o ID, sin distinguir mayúsculas. */
export function coincide(
  expediente: Pick<ExpedientePendienteDto, 'txtNumeroConvenio' | 'fecFirmaConvenio' | 'txtOrganizacion' | 'ideConvenio' | 'ideCierreConvenio'>,
  texto: string
): boolean {
  const termino = texto.trim().toLowerCase();
  if (!termino) return true;
  const numero = expediente.txtNumeroConvenio ? formatConvenioNumber(expediente.txtNumeroConvenio, expediente.fecFirmaConvenio) : null;
  return [numero, expediente.txtOrganizacion, String(expediente.ideConvenio), String(expediente.ideCierreConvenio)]
    .some(valor => valor?.toLowerCase().includes(termino));
}

/**
 * Bandeja del personal (ADR 0013, D4). Las pestañas por semáforo cuentan en el cliente la bandeja
 * completa (`GET /cierres/pendientes`, lo que espera una acción del usuario); "Todos" usa la
 * paginación del servidor (`GET /cierres`), como el resto de listados del ecosistema.
 */
@Component({
  selector: 'app-bandeja',
  standalone: true,
  host: { class: 'block' },
  imports: [
    AvisoCalendarioComponent,
    DatePipe,
    FormatConvenioPipe,
    NgClass,
    FormsModule,
    UIButtonComponent,
    UIModalComponent,
    UiAutocompleteComponent,
    UiDataTableComponent,
    UiFilterBarComponent,
    UiKpiComponent,
    UiPaginationComponent,
    EstadoCierrePillComponent
  ],
  templateUrl: './bandeja.component.html'
})
export class BandejaComponent implements OnInit {
  private api = inject(CierreApiService);
  private auth = inject(AuthService);
  private convenios = inject(ConvenioSelService);
  private router = inject(Router);
  private toast = inject(ToastService);

  readonly cantidadPorPagina = environment.paginacion.cantidadPorPagina;
  readonly busquedaConvenios = environment.busquedaConvenios;
  readonly semaforos = SEMAFOROS;
  readonly estados = ESTADOS_CIERRE;
  readonly etiquetaSemaforo = ETIQUETA_SEMAFORO;
  readonly etiquetaEstado = etiquetaEstado;
  readonly etiquetaAccion = etiquetaAccion;
  readonly etiquetaTipoPlazo = etiquetaTipoPlazo;
  readonly claseSemaforo = claseSemaforo;

  /** Tarjetas del semáforo (y "Todos"), que hacen de pestañas. */
  readonly kpis: readonly { clave: PestanaBandeja; etiqueta: string; detalle: string; variante: KpiVariant; icono: string }[] = [
    { clave: 'VENCIDO', etiqueta: 'Vencidos', detalle: 'Requieren acción inmediata', variante: 'danger', icono: 'alarm' },
    { clave: 'POR_VENCER', etiqueta: 'Por vencer', detalle: 'Vencen en los próximos días', variante: 'warning', icono: 'hourglass_bottom' },
    { clave: 'EN_PLAZO', etiqueta: 'En plazo', detalle: 'Dentro del plazo legal', variante: 'success', icono: 'event_available' },
    { clave: 'SIN_PLAZO', etiqueta: 'Sin plazo', detalle: 'Etapas sin plazo legal', variante: 'default', icono: 'schedule' },
    { clave: 'TODOS', etiqueta: 'Todos', detalle: 'Expedientes del módulo', variante: 'default', icono: 'folder_open' }
  ];

  readonly columnasPendientes: TableColumn[] = [
    { field: 'txtNumeroConvenio', header: 'Convenio', type: 'custom' },
    { field: 'txtOrganizacion', header: 'Organización' },
    { field: 'estCierre', header: 'Estado', type: 'custom' },
    { field: 'plazo', header: 'Plazo', type: 'custom' },
    { field: 'acciones', header: 'Le corresponde', type: 'custom' }
  ];

  readonly columnasTodos: TableColumn[] = [
    { field: 'txtNumeroConvenio', header: 'Convenio', type: 'custom' },
    { field: 'txtOrganizacion', header: 'Organización' },
    { field: 'estCierre', header: 'Estado', type: 'custom' },
    { field: 'fecInicio', header: 'Inicio', type: 'custom' }
  ];

  pestana = signal<PestanaBandeja>('VENCIDO');
  busqueda = signal('');

  pendientes = signal<ExpedientePendienteDto[]>([]);
  cargandoPendientes = signal(true);

  todos = signal<CierreDto[]>([]);
  totalTodos = signal(0);
  paginaTodos = signal(1);
  filtroEstado = signal<EstadoCierre | ''>('');
  cargandoTodos = signal(false);
  todosCargados = signal(false);

  /** Solo el administrador puede completar el calendario de días inhábiles. */
  esAdmin = computed(() => this.auth.roles().includes('ADMIN'));
  puedeIniciar = computed(() => tieneAlgunRol(this.auth.roles(), ['UN', 'JEFE_UN']));
  modalIniciar = signal(false);
  iniciando = signal(false);

  /** Búsqueda del convenio a cerrar en sel-api-general (ADR 0014, Fase 1): la UN no conoce el postulanteId. */
  buscador = viewChild(UiAutocompleteComponent);
  sugerencias = signal<ConvenioSelDto[]>([]);
  buscandoConvenios = signal(false);
  errorBusqueda = signal<string | null>(null);
  convenioElegido = signal<ConvenioSelDto | null>(null);
  soloCartera = computed(() => buscaEnCartera(this.auth.roles()));
  private busquedaEnCurso?: Subscription;

  readonly textoConvenio = (c: ConvenioSelDto) => `${formatConvenioNumber(c.numeroConvenio, c.fechaFirma)} · ${c.razonSocial}`;
  readonly detalleConvenio = (c: ConvenioSelDto) => `RUC ${c.ruc}`;

  conteo = computed(() => {
    const conteo: Record<SemaforoPlazo, number> = { VENCIDO: 0, POR_VENCER: 0, EN_PLAZO: 0, SIN_PLAZO: 0 };
    for (const p of this.pendientes()) conteo[p.tipSemaforo] += 1;
    return conteo;
  });

  pendientesVisibles = computed(() => {
    const pestana = this.pestana();
    const texto = this.busqueda();
    return this.pendientes().filter(p => p.tipSemaforo === pestana && coincide(p, texto));
  });

  mensajeVacio = computed(() => {
    const pestana = this.pestana();
    return pestana === 'TODOS' ? '' : `No tiene expedientes en "${ETIQUETA_SEMAFORO[pestana]}"`;
  });

  todosVisibles = computed(() => this.todos().filter(c => coincide(c, this.busqueda())));

  ngOnInit() {
    this.cargarPendientes();
  }

  cargarPendientes() {
    this.cargandoPendientes.set(true);
    this.api.listarTodosLosPendientes().subscribe({
      next: items => {
        this.pendientes.set(items);
        this.cargandoPendientes.set(false);
        this.cambiarPestana(pestanaInicial(this.conteo()));
      },
      error: err => {
        this.cargandoPendientes.set(false);
        this.toast.error('No se pudo cargar la bandeja', mensajeParaUsuario(err, 'Intente nuevamente.'));
      }
    });
  }

  cambiarPestana(pestana: PestanaBandeja) {
    this.pestana.set(pestana);
    if (pestana === 'TODOS' && this.todos().length === 0) {
      this.cargarTodos(1);
    }
  }

  cargarTodos(pagina = this.paginaTodos()) {
    this.paginaTodos.set(pagina);
    this.cargandoTodos.set(true);
    this.api
      .listar({ estado: this.filtroEstado() || null, pagina, cantidad: this.cantidadPorPagina })
      .subscribe({
        next: datos => {
          this.todos.set(datos.items);
          this.totalTodos.set(datos.total);
          this.todosCargados.set(true);
          this.cargandoTodos.set(false);
        },
        error: err => {
          this.cargandoTodos.set(false);
          this.toast.error('No se pudieron cargar los expedientes', mensajeParaUsuario(err, 'Intente nuevamente.'));
        }
      });
  }

  cambiarFiltroEstado(estado: EstadoCierre | '') {
    this.filtroEstado.set(estado);
    this.cargarTodos(1);
  }

  abrir(expediente: { ideCierreConvenio: number }) {
    this.router.navigate(['/expedientes', expediente.ideCierreConvenio]);
  }

  /** Valor de cada KPI: el conteo de la bandeja, o el total de "Todos" una vez consultado. */
  valorKpi(clave: PestanaBandeja): string {
    if (clave === 'TODOS') return this.todosCargados() ? String(this.totalTodos()) : '—';
    return this.cargandoPendientes() ? '…' : String(this.conteo()[clave]);
  }

  textoPlazo(p: ExpedientePendienteDto): string {
    if (p.numDiasRestantes === null) return 'Sin plazo';
    if (p.numDiasRestantes < 0) return `Vencido hace ${-p.numDiasRestantes} d`;
    if (p.numDiasRestantes === 0) return 'Vence hoy';
    return `${p.numDiasRestantes} d restantes`;
  }

  abrirModalIniciar() {
    this.convenioElegido.set(null);
    this.sugerencias.set([]);
    this.errorBusqueda.set(null);
    this.buscador()?.clear();
    this.modalIniciar.set(true);
  }

  cerrarModalIniciar() {
    this.busquedaEnCurso?.unsubscribe();
    this.modalIniciar.set(false);
  }

  buscarConvenios(texto: string) {
    // Solo cuenta la última búsqueda: una respuesta lenta de un término anterior no pisa las sugerencias.
    this.busquedaEnCurso?.unsubscribe();
    this.buscandoConvenios.set(true);
    this.errorBusqueda.set(null);
    this.busquedaEnCurso = this.convenios.buscar(texto, this.auth.roles()).subscribe({
      next: items => {
        this.sugerencias.set(items);
        this.buscandoConvenios.set(false);
      },
      error: err => {
        this.sugerencias.set([]);
        this.buscandoConvenios.set(false);
        this.errorBusqueda.set(mensajeParaUsuario(err, 'No se pudo consultar el SEL. Intente nuevamente.'));
      }
    });
  }

  iniciar() {
    const convenio = this.convenioElegido();
    if (!convenio) return;
    this.iniciando.set(true);
    this.api.iniciar(convenio.id).subscribe({
      next: resultado => {
        this.iniciando.set(false);
        this.modalIniciar.set(false);
        this.toast.success(resultado.resultado === 'CREADO' ? 'Expediente abierto' : 'El expediente ya existía', resultado.mensaje);
        if (resultado.cierre) this.abrir(resultado.cierre);
      },
      error: err => {
        this.iniciando.set(false);
        this.toast.error('No se pudo abrir el expediente', mensajeParaUsuario(err, 'Intente nuevamente.'));
      }
    });
  }
}

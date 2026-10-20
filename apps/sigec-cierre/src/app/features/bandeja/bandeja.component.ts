import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  TableColumn,
  ToastService,
  UIButtonComponent,
  UIModalComponent,
  UiDataTableComponent,
  UiFilterBarComponent,
  UiPaginationComponent
} from '@agroideas/ui';
import { mensajeParaUsuario } from '@agroideas/utils';
import { environment } from '../../../environments/environment';
import { CierreApiService } from '../../core/services/cierre-api.service';
import { AuthService } from '../../core/services/auth.service';
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

/** Busca por número de convenio, organización o ID, sin distinguir mayúsculas. */
export function coincide(expediente: Pick<ExpedientePendienteDto, 'txtNumeroConvenio' | 'txtOrganizacion' | 'ideConvenio' | 'ideCierreConvenio'>, texto: string): boolean {
  const termino = texto.trim().toLowerCase();
  if (!termino) return true;
  return [expediente.txtNumeroConvenio, expediente.txtOrganizacion, String(expediente.ideConvenio), String(expediente.ideCierreConvenio)]
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
  imports: [
    DatePipe,
    NgClass,
    FormsModule,
    UIButtonComponent,
    UIModalComponent,
    UiDataTableComponent,
    UiFilterBarComponent,
    UiPaginationComponent,
    EstadoCierrePillComponent
  ],
  templateUrl: './bandeja.component.html'
})
export class BandejaComponent implements OnInit {
  private api = inject(CierreApiService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  readonly cantidadPorPagina = environment.paginacion.cantidadPorPagina;
  readonly semaforos = SEMAFOROS;
  readonly estados = ESTADOS_CIERRE;
  readonly etiquetaSemaforo = ETIQUETA_SEMAFORO;
  readonly etiquetaEstado = etiquetaEstado;
  readonly etiquetaAccion = etiquetaAccion;
  readonly etiquetaTipoPlazo = etiquetaTipoPlazo;
  readonly claseSemaforo = claseSemaforo;

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

  puedeIniciar = computed(() => tieneAlgunRol(this.auth.roles(), ['UN', 'JEFE_UN']));
  modalIniciar = signal(false);
  ideConvenioNuevo: number | null = null;
  iniciando = signal(false);

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

  textoPlazo(p: ExpedientePendienteDto): string {
    if (p.numDiasRestantes === null) return 'Sin plazo';
    if (p.numDiasRestantes < 0) return `Vencido hace ${-p.numDiasRestantes} d`;
    if (p.numDiasRestantes === 0) return 'Vence hoy';
    return `${p.numDiasRestantes} d restantes`;
  }

  abrirModalIniciar() {
    this.ideConvenioNuevo = null;
    this.modalIniciar.set(true);
  }

  iniciar() {
    if (!this.ideConvenioNuevo) return;
    this.iniciando.set(true);
    this.api.iniciar(this.ideConvenioNuevo).subscribe({
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

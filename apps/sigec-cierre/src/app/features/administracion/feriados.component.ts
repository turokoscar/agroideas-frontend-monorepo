import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { DatePipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService, UIButtonComponent, UIModalComponent } from '@agroideas/ui';
import { mensajeParaUsuario } from '@agroideas/utils';
import { environment } from '../../../environments/environment';
import { CierreApiService } from '../../core/services/cierre-api.service';
import {
  CrearFeriadoRequest,
  DEPARTAMENTOS,
  FeriadoDto,
  FeriadoPropuestoDto,
  TIPOS_DIA,
  errorAlcance,
  etiquetaTipoDia,
  nombreDepartamento
} from '../../core/models/calendario.model';

/** Formulario del modal de alta o edición. */
interface FormularioFeriado {
  ideFeriado: number | null;
  fecDia: string;
  tipDia: string;
  codDepartamento: string | null;
  codProvincia: string | null;
  txtDescripcion: string;
  txtSustento: string | null;
}

/** Propuesta de gob.pe con su casilla de selección. */
interface PropuestaSeleccionable extends FeriadoPropuestoDto {
  seleccionado: boolean;
}

/**
 * Calendario de días inhábiles (ADR 0013 Fase 5; ADR-001 D6 de la API): de él salen los vencimientos de los plazos.
 * Lo administra el Administrador del sistema: alta, corrección y baja manual, e importación asistida desde gob.pe
 * (la API propone; se registran solo los que se aceptan, con origen `GOB_PE`).
 */
@Component({
  selector: 'app-feriados',
  standalone: true,
  imports: [DatePipe, NgClass, FormsModule, UIButtonComponent, UIModalComponent],
  templateUrl: './feriados.component.html'
})
export class FeriadosComponent implements OnInit {
  private api = inject(CierreApiService);
  private toast = inject(ToastService);

  readonly tipos = TIPOS_DIA;
  readonly departamentos = DEPARTAMENTOS;
  readonly etiquetaTipoDia = etiquetaTipoDia;
  readonly nombreDepartamento = nombreDepartamento;
  readonly limites = environment.administracion;
  readonly anioActual = new Date().getFullYear();
  /** Del año siguiente al primero que publica gob.pe. */
  readonly anios = Array.from({ length: this.anioActual + 2 - this.limites.primerAnioGobPe }, (_, i) => this.anioActual + 1 - i);

  anio = signal(this.anioActual);
  cargando = signal(false);
  feriados = signal<FeriadoDto[]>([]);
  guardando = signal(false);

  formulario = signal<FormularioFeriado | null>(null);
  aBorrar = signal<FeriadoDto | null>(null);

  importando = signal(false);
  propuestas = signal<PropuestaSeleccionable[] | null>(null);
  seleccionadas = computed(() => (this.propuestas() ?? []).filter(p => p.seleccionado && !p.yaRegistrado));

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    this.api.listarFeriados(this.anio()).subscribe({
      next: lista => {
        this.feriados.set([...lista].sort((a, b) => a.fecDia.localeCompare(b.fecDia)));
        this.cargando.set(false);
      },
      error: err => {
        this.cargando.set(false);
        this.toast.error('No se pudo cargar el calendario', mensajeParaUsuario(err, 'Intente nuevamente.'));
      }
    });
  }

  cambiarAnio(anio: number) {
    this.anio.set(anio);
    this.cargar();
  }

  nuevo() {
    this.formulario.set({
      ideFeriado: null, fecDia: `${this.anio()}-01-01`, tipDia: 'FERIADO_NACIONAL',
      codDepartamento: null, codProvincia: null, txtDescripcion: '', txtSustento: null
    });
  }

  editar(f: FeriadoDto) {
    this.formulario.set({
      ideFeriado: f.ideFeriado, fecDia: f.fecDia.slice(0, 10), tipDia: f.tipDia, codDepartamento: f.codDepartamento,
      codProvincia: f.codProvincia, txtDescripcion: f.txtDescripcion, txtSustento: f.txtSustento
    });
  }

  /** Errores del formulario (método: el formulario se edita mutando la copia). */
  errorFormulario(): string | null {
    const f = this.formulario();
    if (!f) return null;
    if (!f.fecDia) return 'Indique la fecha.';
    if (!f.txtDescripcion.trim()) return 'Indique la descripción.';
    return errorAlcance(f.tipDia, f.codDepartamento, f.codProvincia);
  }

  guardar() {
    const f = this.formulario();
    if (!f || this.errorFormulario()) return;
    const alcance = f.tipDia === 'REGIONAL'
      ? { codDepartamento: f.codDepartamento, codProvincia: f.codProvincia?.trim() || null }
      : { codDepartamento: null, codProvincia: null };
    const sustento = f.txtSustento?.trim() || null;
    const peticion: Observable<unknown> = f.ideFeriado === null
      ? this.api.crearFeriados([{ fecDia: f.fecDia, tipDia: f.tipDia, ...alcance, txtDescripcion: f.txtDescripcion.trim(), txtSustento: sustento, tipOrigen: 'MANUAL' }])
      : this.api.actualizarFeriado(f.ideFeriado, { ...alcance, txtDescripcion: f.txtDescripcion.trim(), txtSustento: sustento });
    this.guardando.set(true);
    peticion.subscribe({
      next: () => this.listo(f.ideFeriado === null ? 'Día registrado' : 'Día actualizado', () => this.formulario.set(null)),
      error: err => this.falla('No se pudo guardar el día', err)
    });
  }

  desactivar() {
    const f = this.aBorrar();
    if (!f) return;
    this.guardando.set(true);
    this.api.desactivarFeriado(f.ideFeriado).subscribe({
      next: () => this.listo('Día dado de baja', () => this.aBorrar.set(null)),
      error: err => this.falla('No se pudo dar de baja el día', err)
    });
  }

  importar() {
    this.importando.set(true);
    this.api.proponerFeriadosGobPe(this.anio()).subscribe({
      next: propuestas => {
        this.importando.set(false);
        this.propuestas.set(propuestas.map(p => ({ ...p, seleccionado: !p.yaRegistrado && !p.revisarAlcance })));
      },
      error: err => {
        this.importando.set(false);
        this.toast.error('No se pudo leer gob.pe', mensajeParaUsuario(err, 'Intente nuevamente más tarde.'));
      }
    });
  }

  alternarPropuesta(indice: number) {
    this.propuestas.update(lista => (lista ?? []).map((p, i) => (i === indice ? { ...p, seleccionado: !p.seleccionado } : p)));
  }

  registrarPropuestas() {
    const feriados: CrearFeriadoRequest[] = this.seleccionadas().map(p => ({
      fecDia: p.fecDia.slice(0, 10), tipDia: p.tipDia, codDepartamento: p.codDepartamento, codProvincia: null,
      txtDescripcion: p.txtDescripcion, txtSustento: p.txtSustento, tipOrigen: 'GOB_PE'
    }));
    if (!feriados.length) return;
    this.guardando.set(true);
    this.api.crearFeriados(feriados).subscribe({
      next: () => this.listo(`${feriados.length} día(s) registrados desde gob.pe`, () => this.propuestas.set(null)),
      error: err => this.falla('No se registraron los días', err)
    });
  }

  private listo(mensaje: string, cerrar: () => void) {
    this.guardando.set(false);
    cerrar();
    this.toast.success(mensaje, 'Los plazos que venzan desde ahora usan el calendario actualizado.');
    this.cargar();
  }

  private falla(titulo: string, err: unknown) {
    this.guardando.set(false);
    this.toast.error(titulo, mensajeParaUsuario(err, 'Intente nuevamente.'));
  }
}

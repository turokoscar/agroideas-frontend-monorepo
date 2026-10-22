import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService, UIButtonComponent, UiStateComponent } from '@agroideas/ui';
import { mensajeParaUsuario } from '@agroideas/utils';
import { environment } from '../../../environments/environment';
import { CierreApiService } from '../../core/services/cierre-api.service';
import { GrupoParametro, ParametroDto, errorParametro, grupoParametro } from '../../core/models/parametro.model';

const GRUPOS: readonly { clave: GrupoParametro; titulo: string; ayuda: string }[] = [
  { clave: 'plazos', titulo: 'Plazos (días hábiles)', ayuda: 'Se aplican a los plazos que se abran desde ahora; los vigentes conservan su vencimiento.' },
  { clave: 'sede', titulo: 'Sede (ubigeo)', ayuda: 'Calendario regional que se aplica a los plazos de las unidades de la sede.' },
  { clave: 'correos', titulo: 'Correos de aviso', ayuda: 'Separados por coma o punto y coma. Vacío: no se envía correo a ese actor.' },
  { clave: 'otros', titulo: 'Otros', ayuda: '' }
];

/**
 * Parámetros del módulo (ADR 0013 Fase 5): plazos, sede y correos, editables por el Administrador del sistema. Cada
 * fila se guarda por separado (`PUT /parametros/{codigo}`) con la misma validación que la API.
 */
@Component({
  selector: 'app-parametros',
  standalone: true,
  host: { class: 'block' },
  imports: [DatePipe, FormsModule, UIButtonComponent, UiStateComponent],
  template: `
    @if (cargando()) {
      <ui-state kind="loading" message="Cargando los parámetros…" compact />
    } @else {
      <div class="space-y-4">
        @for (g of grupos(); track g.clave) {
          <section class="form-card-flat space-y-3">
            <div>
              <h5 class="form-section-title">{{ g.titulo }}</h5>
              @if (g.ayuda) { <p class="text-xs text-muted-foreground">{{ g.ayuda }}</p> }
            </div>
            @for (p of g.parametros; track p.codParametro) {
              <div class="grid grid-cols-1 items-start gap-2 border-t border-border/40 pt-3 sm:grid-cols-[1fr_minmax(0,320px)_auto]">
                <div>
                  <label class="form-label" [for]="'par-' + p.codParametro">{{ p.txtDescripcion }}</label>
                  <span class="block text-[11px] text-muted-foreground/70">{{ p.codParametro }} · modificado el {{ p.fecModificacion | date: 'dd/MM/yyyy HH:mm' }}</span>
                </div>
                <div class="form-field">
                  <input class="form-input" [id]="'par-' + p.codParametro" [maxlength]="longitudValor"
                    [type]="g.clave === 'plazos' ? 'number' : 'text'" [ngModel]="valor(p)" (ngModelChange)="editar(p.codParametro, $event)" />
                  @if (error(p); as e) { <span class="text-[11px] text-destructive">{{ e }}</span> }
                </div>
                <ui-button icon="save" label="Guardar" size="sm" [loading]="guardando() === p.codParametro"
                  [disabled]="!cambiado(p) || !!error(p) || guardando() !== null" (onClick)="guardar(p)" />
              </div>
            }
          </section>
        }
      </div>
    }
  `
})
export class ParametrosComponent implements OnInit {
  private api = inject(CierreApiService);
  private toast = inject(ToastService);

  readonly longitudValor = environment.administracion.longitudValorParametro;

  cargando = signal(false);
  parametros = signal<ParametroDto[]>([]);
  /** Valores editados aún sin guardar, por código. */
  borradores = signal<Record<string, string>>({});
  guardando = signal<string | null>(null);

  grupos = computed(() =>
    GRUPOS.map(g => ({ ...g, parametros: this.parametros().filter(p => grupoParametro(p.codParametro) === g.clave) })).filter(g => g.parametros.length)
  );

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    this.api.listarParametros().subscribe({
      next: lista => {
        this.parametros.set(lista);
        this.cargando.set(false);
      },
      error: err => {
        this.cargando.set(false);
        this.toast.error('No se pudieron cargar los parámetros', mensajeParaUsuario(err, 'Intente nuevamente.'));
      }
    });
  }

  valor(p: ParametroDto): string {
    return this.borradores()[p.codParametro] ?? p.txtValor;
  }

  editar(codigo: string, valor: string | number | null) {
    this.borradores.update(b => ({ ...b, [codigo]: valor === null ? '' : String(valor) }));
  }

  cambiado(p: ParametroDto): boolean {
    return this.valor(p).trim() !== p.txtValor;
  }

  error(p: ParametroDto): string | null {
    return this.cambiado(p) ? errorParametro(p.codParametro, this.valor(p)) : null;
  }

  guardar(p: ParametroDto) {
    const valor = this.valor(p).trim();
    if (this.error(p)) return;
    this.guardando.set(p.codParametro);
    this.api.actualizarParametro(p.codParametro, valor).subscribe({
      next: actualizado => {
        this.guardando.set(null);
        this.parametros.update(lista => lista.map(x => (x.codParametro === actualizado.codParametro ? actualizado : x)));
        this.borradores.update(b => {
          const resto = { ...b };
          delete resto[p.codParametro];
          return resto;
        });
        this.toast.success('Parámetro actualizado', p.txtDescripcion);
      },
      error: err => {
        this.guardando.set(null);
        this.toast.error('No se pudo guardar el parámetro', mensajeParaUsuario(err, 'Intente nuevamente.'));
      }
    });
  }
}

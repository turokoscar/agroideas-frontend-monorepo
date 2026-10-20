import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, map, of, catchError } from 'rxjs';
import { environment } from '../../environments/environment';
import { CierreApiService } from '../core/services/cierre-api.service';
import { aniosACubrir } from '../core/models/calendario.model';

/**
 * Avisa si el calendario de días inhábiles no cubre los próximos meses (ADR 0013): un año sin ningún día registrado
 * (p. ej. el siguiente, si gob.pe aún no lo publica) hace que los plazos que vencen en él no salten sus feriados, sin
 * error visible. El periodo a cubrir es `AppSettings.administracion.diasAnticipacionCalendario`.
 */
@Component({
  selector: 'app-aviso-calendario',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (aniosSinCalendario().length > 0) {
      <div class="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-foreground">
        <div class="flex items-start gap-2">
          <span class="material-symbols-outlined text-[20px] text-warning">event_busy</span>
          <span>
            No hay días inhábiles registrados para <span class="font-semibold">{{ aniosSinCalendario().join(' y ') }}</span>. Los plazos
            que venzan entonces se calcularán sin saltar sus feriados: impórtelos desde gob.pe en cuanto se publiquen, o regístrelos a mano.
          </span>
        </div>
        @if (enlace()) {
          <a routerLink="/administracion" class="shrink-0 rounded-lg bg-warning px-4 py-2 text-xs font-semibold text-warning-foreground hover:bg-warning/90">
            Ir al calendario
          </a>
        }
      </div>
    }
  `
})
export class AvisoCalendarioComponent {
  private api = inject(CierreApiService);

  /** Muestra el enlace a Administración (fuera de esa pantalla). */
  enlace = input(false);
  /** Cambia cuando el calendario se modificó, para volver a consultarlo. */
  version = input(0);

  aniosSinCalendario = signal<number[]>([]);

  constructor() {
    effect(() => {
      this.version();
      untracked(() => this.revisar());
    });
  }

  revisar() {
    const anios = aniosACubrir(environment.administracion.diasAnticipacionCalendario);
    forkJoin(
      anios.map(anio =>
        this.api.listarFeriados(anio).pipe(
          map(dias => (dias.length === 0 ? anio : null)),
          // Si no se puede consultar, no se avisa: el aviso es una ayuda, no un bloqueo.
          catchError(() => of(null))
        )
      )
    ).subscribe(resultado => this.aniosSinCalendario.set(resultado.filter((anio): anio is number => anio !== null)));
  }
}

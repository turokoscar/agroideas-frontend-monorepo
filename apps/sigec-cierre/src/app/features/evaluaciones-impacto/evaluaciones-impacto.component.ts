import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StatusTone, ToastService, UIButtonComponent, UiPaginationComponent, UiStatusPillComponent, UiStateComponent } from '@agroideas/ui';
import { FormatConvenioPipe, mensajeParaUsuario } from '@agroideas/utils';
import { environment } from '../../../environments/environment';
import { CierreApiService } from '../../core/services/cierre-api.service';
import { ETIQUETA_SECCION, EvaluacionImpactoDto, criticos } from '../../core/models/evaluacion-impacto.model';
import { RESULTADOS } from '../../core/models/anexo22.model';

/**
 * Evaluaciones de impacto para la USE (ADR 0013 Fase 5): los Anexos 22 firmados (`GET /evaluaciones-impacto`), con
 * filtros por cadena y región. Por convenio: cadena, región, socios, hectáreas, resultado y cuántos indicadores
 * tienen desviación crítica; al expandir, cada indicador con año base, programado y ejecutado por año y variaciones.
 */
@Component({
  selector: 'app-evaluaciones-impacto',
  standalone: true,
  host: { class: 'block' },
  imports: [DatePipe, DecimalPipe, NgClass, FormsModule, UIButtonComponent, UiPaginationComponent, UiStatusPillComponent, FormatConvenioPipe, UiStateComponent],
  templateUrl: './evaluaciones-impacto.component.html'
})
export class EvaluacionesImpactoComponent implements OnInit {
  private api = inject(CierreApiService);
  private toast = inject(ToastService);

  readonly cantidadPorPagina = environment.paginacion.cantidadPorPagina;
  readonly etiquetaSeccion = (s: string) => ETIQUETA_SECCION[s] ?? s;
  readonly criticos = criticos;

  cadena = '';
  region = '';
  cargando = signal(false);
  evaluaciones = signal<EvaluacionImpactoDto[]>([]);
  total = signal(0);
  pagina = signal(1);
  abierta = signal<number | null>(null);

  ngOnInit() {
    this.buscar(1);
  }

  buscar(pagina = this.pagina()) {
    this.pagina.set(pagina);
    this.cargando.set(true);
    this.api
      .listarEvaluacionesImpacto({ cadena: this.cadena, region: this.region, pagina, cantidad: this.cantidadPorPagina })
      .subscribe({
        next: datos => {
          this.evaluaciones.set(datos.items);
          this.total.set(datos.total);
          this.cargando.set(false);
        },
        error: err => {
          this.cargando.set(false);
          this.toast.error('No se pudieron cargar las evaluaciones', mensajeParaUsuario(err, 'Intente nuevamente.'));
        }
      });
  }

  limpiar() {
    this.cadena = '';
    this.region = '';
    this.buscar(1);
  }

  alternar(ideCierre: number) {
    this.abierta.update(actual => (actual === ideCierre ? null : ideCierre));
  }

  resultado(tip: string | null): string {
    return RESULTADOS.find(r => r.valor === tip)?.etiqueta ?? '—';
  }

  tonoResultado(tip: string | null): StatusTone {
    switch (tip) {
      case 'CONFORME': return 'success';
      case 'CON_OBSERVACIONES': return 'warning';
      case 'NO_EJECUTADO': return 'danger';
      default: return 'neutral';
    }
  }


  numero(v: number | null | undefined): string {
    return v == null ? '—' : v.toLocaleString('es-PE', { maximumFractionDigits: 2 });
  }
}

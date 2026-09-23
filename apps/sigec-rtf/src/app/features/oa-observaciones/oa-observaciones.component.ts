import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, of, switchMap } from 'rxjs';
import { RtfService } from '../../core/services/rtf.service';
import { ToastService, UIButtonComponent } from '@agroideas/ui';
import { RevisionDto, UrEvaluacionItemKind, parseSeccionRevision } from '../../core/models';

interface ObservacionVista {
  ideRevision: number;
  id: number;
  kind: UrEvaluacionItemKind;
  titulo: string;
  categoria?: string;
  observacion?: string;
  subsanable?: boolean;
  atendida: boolean;
  respuestaOa?: string;
}

/**
 * ADR-014 (frontend) Fases 3 y 5: pliego de observaciones real de la OA, reemplaza el mock
 * desconectado que había antes (onSubmit() solo cambiaba un signal local, sin llamar al
 * backend). Lectura vía `GET rtfs/{id}/evaluaciones` (sin cambios de backend, mismo endpoint
 * que ya consume `UnGabineteComponent`) y el parser compartido de `txt_seccion`. Escritura vía
 * `POST rtfs/{id}/evaluaciones/atencion` (ADR-016 Fase 3, `sigec-api-rtf`) — la OA responde
 * cada observación y la marca como atendida antes de poder reenviar el RTF (gate en
 * `OaRegistroComponent.canSubmit`, espejando el gate real del backend).
 */
@Component({
  selector: 'app-oa-observaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, UIButtonComponent],
  templateUrl: './oa-observaciones.component.html'
})
export class OaObservacionesComponent implements OnInit {
  rtfService = inject(RtfService);
  private router = inject(Router);
  private toast = inject(ToastService);

  isLoading = signal(true);
  hasError = signal(false);
  private idePasoCritico = signal<number | null>(null);
  private revisiones = signal<RevisionDto[]>([]);

  /** Borrador de respuesta por `ideRevision`, mientras la OA escribe antes de guardar. */
  respuestas = signal<Record<number, string>>({});
  /** `ideRevision` que está guardándose ahora mismo (deshabilita solo ese botón, no toda la pantalla). */
  atendiendoId = signal<number | null>(null);

  ngOnInit() {
    const rtfId = this.rtfService.rtfId();
    if (!rtfId) {
      this.hasError.set(true);
      this.isLoading.set(false);
      return;
    }

    this.rtfService.loadDetalleRtf(rtfId).pipe(
      switchMap(data => {
        const idePasoCritico = data?.idePasoCritico;
        this.idePasoCritico.set(idePasoCritico ?? null);
        // Recarga metas/indicadores para el paso crítico de ESTE rtf -- no se puede confiar en
        // lo que haya en memoria (pudo quedar de otro rtf abierto antes), mismo criterio que
        // `OaRegistroComponent.ngOnInit`.
        const cargaPasoCritico = idePasoCritico != null
          ? forkJoin([
              this.rtfService.loadMetasPorPasoCritico(idePasoCritico, rtfId),
              this.rtfService.loadIndicadoresPorPasoCritico(idePasoCritico, rtfId)
            ])
          : of(null);
        return forkJoin([cargaPasoCritico, this.rtfService.obtenerEvaluacionUr(rtfId)]);
      })
    ).subscribe({
      next: ([, evaluacion]) => {
        this.revisiones.set(evaluacion?.revisiones ?? []);
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      }
    });
  }

  /** Vuelve a pedir solo la evaluación (metas/indicadores no cambian al atender una observación). */
  private recargarEvaluacion(rtfId: number) {
    this.rtfService.obtenerEvaluacionUr(rtfId).subscribe({
      next: evaluacion => this.revisiones.set(evaluacion?.revisiones ?? []),
      error: () => { /* silencioso: la pantalla se queda con lo que ya tenía */ }
    });
  }

  /**
   * Cruza cada `RevisionDto` contra las metas/indicadores ya cargados, para mostrar el nombre
   * real del ítem observado -- mismo cruce que hoy hace `UnGabineteComponent` para pintar su
   * tabla de evaluación (ADR-014 frontend, punto 3).
   */
  observaciones = computed<ObservacionVista[]>(() => {
    const metas = this.rtfService.pasoCriticoMetas();
    const indicadores = this.rtfService.pasoCriticoIndicadores();

    return this.revisiones()
      .filter(rev => rev.estConformidad === 'OBSERVADO')
      .map((rev): ObservacionVista | null => {
        const parsed = parseSeccionRevision(rev.txtSeccion);
        if (!parsed) return null;

        const { kind, id } = parsed;
        let titulo: string;
        if (kind === 'META') {
          titulo = metas.find(m => m.id === id)?.descripcion ?? `Meta física #${id}`;
        } else if (kind === 'INDICADOR') {
          titulo = indicadores.find(i => i.id === id)?.indicador ?? `Indicador #${id}`;
        } else {
          titulo = 'Información cualitativa (R1)';
        }

        return {
          ideRevision: rev.ideRevision,
          id,
          kind,
          titulo,
          categoria: rev.txtCategoria,
          observacion: rev.txtObservacion,
          subsanable: rev.estSubsanable,
          atendida: rev.estAtencion === 'ATENDIDA',
          respuestaOa: rev.txtRespuestaOa
        };
      })
      .filter((o): o is ObservacionVista => o !== null);
  });

  hayObservaciones = computed(() => this.observaciones().length > 0);
  pendientes = computed(() => this.observaciones().filter(o => !o.atendida));
  todasAtendidas = computed(() => this.hayObservaciones() && this.pendientes().length === 0);

  respuestaDe(ideRevision: number): string {
    return this.respuestas()[ideRevision] ?? '';
  }

  actualizarRespuesta(ideRevision: number, texto: string) {
    this.respuestas.update(prev => ({ ...prev, [ideRevision]: texto }));
  }

  /** ADR-016 Fase 3: marca una observación como atendida con la respuesta que escribió la OA. */
  atenderObservacion(ideRevision: number) {
    const rtfId = this.rtfService.rtfId();
    const texto = this.respuestaDe(ideRevision).trim();
    if (!rtfId || !texto) return;

    this.atendiendoId.set(ideRevision);
    this.rtfService.atenderObservaciones(rtfId, [{ ideRevision, txtRespuesta: texto }]).subscribe({
      next: () => {
        this.atendiendoId.set(null);
        this.toast.success('Observación atendida', 'Tu respuesta se guardó correctamente.');
        this.recargarEvaluacion(rtfId);
      },
      error: () => {
        this.atendiendoId.set(null);
        this.toast.error('Error', 'No se pudo guardar la respuesta. Intenta nuevamente.');
      }
    });
  }

  categoriaLabel(categoria?: string): string {
    const map: Record<string, string> = {
      TECNICA_FISICA: 'Técnica / Física',
      FINANCIERA: 'Financiera',
      CUALITATIVA: 'Cualitativa'
    };
    return map[categoria ?? ''] ?? 'Sin categoría';
  }

  volver() {
    this.router.navigate(['/rtf/bandeja']);
  }

  irACorregir() {
    const idpc = this.idePasoCritico();
    const ruta = idpc != null
      ? ['/rtf/pasos-criticos', idpc, 'registrar']
      : ['/rtf/pasos-criticos/registrar'];
    this.router.navigate(ruta);
  }
}

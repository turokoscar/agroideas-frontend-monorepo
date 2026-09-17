import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin, of, switchMap } from 'rxjs';
import { RtfService } from '../../core/services/rtf.service';
import { RevisionDto, UrEvaluacionItemKind, parseSeccionRevision } from '../../core/models';

interface ObservacionVista {
  id: number;
  kind: UrEvaluacionItemKind;
  titulo: string;
  categoria?: string;
  observacion?: string;
  subsanable?: boolean;
}

/**
 * ADR-014 (frontend) Fase 3: pliego de observaciones real de la OA, reemplaza el mock
 * desconectado que había antes (onSubmit() solo cambiaba un signal local, sin llamar al
 * backend). Reutiliza `GET rtfs/{id}/evaluaciones` (sin cambios de backend, mismo endpoint
 * que ya consume `UnGabineteComponent`) y el parser compartido de `txt_seccion`.
 *
 * Modo solo lectura: el endpoint de "atender" (`POST rtfs/{id}/evaluaciones/atencion`) es
 * ADR-016 Fase 3 en `sigec-api-rtf`, todavía no implementado — ver Fase 5 de este ADR.
 */
@Component({
  selector: 'app-oa-observaciones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './oa-observaciones.component.html'
})
export class OaObservacionesComponent implements OnInit {
  rtfService = inject(RtfService);
  private router = inject(Router);

  isLoading = signal(true);
  hasError = signal(false);
  private idePasoCritico = signal<number | null>(null);
  private revisiones = signal<RevisionDto[]>([]);

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

  /**
   * Cruza cada `RevisionDto` contra las metas/indicadores ya cargados, para mostrar el nombre
   * real del ítem observado -- mismo cruce que hoy hace `UnGabineteComponent` para pintar su
   * tabla de evaluación (ADR-014 frontend, punto 3).
   */
  observacionesPendientes = computed<ObservacionVista[]>(() => {
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
          id,
          kind,
          titulo,
          categoria: rev.txtCategoria,
          observacion: rev.txtObservacion,
          subsanable: rev.estSubsanable
        };
      })
      .filter((o): o is ObservacionVista => o !== null);
  });

  hayObservaciones = computed(() => this.observacionesPendientes().length > 0);

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

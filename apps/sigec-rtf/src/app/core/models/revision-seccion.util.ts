import { UrEvaluacionItemKind } from './ur-evaluacion-item.dto';

/**
 * `PoliticaEvaluacionUr.ConstruirClaveSeccion` (sigec-api-rtf, ADR-014 §Parte 4) arma
 * `txt_seccion` como `UR_{KIND}_{ID}` (p. ej. `"UR_META_7"`, `"UR_R1_142"`) — `KIND` nunca
 * lleva guion bajo, así que partir en el primer `_` restante no es ambiguo.
 *
 * Extraído de `UnGabineteComponent.cargarEvaluacionUr` (ADR-014 frontend, punto 2) para que
 * `OaObservacionesComponent` — el pliego de observaciones del lado OA — cruce las mismas
 * filas de `RevisionDto` contra metas/indicadores sin duplicar el parser.
 */
export function parseSeccionRevision(txtSeccion: string): { kind: UrEvaluacionItemKind; id: number } | null {
  const sinPrefijo = txtSeccion.replace(/^UR_/, '');
  const separador = sinPrefijo.indexOf('_');
  if (separador < 0) return null;

  const kind = sinPrefijo.slice(0, separador) as UrEvaluacionItemKind;
  const id = Number(sinPrefijo.slice(separador + 1));
  if (!Number.isFinite(id)) return null;

  return { kind, id };
}

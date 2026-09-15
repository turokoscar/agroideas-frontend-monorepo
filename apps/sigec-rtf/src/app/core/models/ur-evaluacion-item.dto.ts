/** ADR-014 Parte 4: 'R1' = veredicto único para la sección cualitativa completa (no por pregunta). */
export type UrEvaluacionItemKind = 'META' | 'INDICADOR' | 'R1';

/** ADR-014 Parte 4: categoría de la observación, para el pliego que ve la OA. */
export type CategoriaObservacion = 'TECNICA_FISICA' | 'FINANCIERA' | 'CUALITATIVA';

export interface UrEvaluacionItemDto {
  id: number;
  kind: UrEvaluacionItemKind;
  estConformidad: 'CONFORME' | 'OBSERVADO';
  txtObservacion?: string;
  /** ADR-014 Parte 4. */
  txtCategoria?: CategoriaObservacion;
  /** ADR-014 Parte 4: si la observación es subsanable por la OA. */
  estSubsanable?: boolean;
}

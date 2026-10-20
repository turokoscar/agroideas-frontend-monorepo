/**
 * Estado del formulario del Anexo 20 del convenio (`GET /convenios/{id}/anexos20`). Sigec-cierre solo necesita saber
 * si está completo para que la UN lo presente (ADR 0013): el formulario lo llena la OA en sigec-rtf.
 */
export interface Anexo20ResumenDto {
  /** 0 si aún no se guardó (es la propuesta precargada del SEL). */
  ideAnexo20: number;
  ideConvenio: number;
  /** BORRADOR | PRESENTADO. */
  estAnexo20: string;
  numAnexo20: string | null;
  /** Lo que falta para generar y presentar el Anexo 20. */
  faltantes: string[];
}

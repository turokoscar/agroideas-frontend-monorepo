/**
 * Control de plazo legal de un RTF (ADR-012 de sigec-api-rtf/docs — no confundir con el ADR-012
 * propio de este monorepo en apps/sigec-rtf/adr/, que trata un tema distinto). Puede haber más de
 * un plazo por RTF a lo largo de su ciclo de vida (presentación, subsanación, reevaluación); el
 * backend siempre resuelve cuál es el vigente según `tipPlazo`.
 */
export interface ControlPlazoDto {
  ideControlPlazo?: number;
  ideRtf: number;
  tipPlazo: 'PRESENTACION_INICIAL' | 'SUBSANACION_OBSERVACION' | 'REEVALUACION_UN' | string;
  fecHabilitacion: string;
  fecLimite: string;
  estPlazo: 'ACTIVO' | 'VENCIDO' | 'BLOQUEADO' | string;
  fecRegistro?: string;
  /** Calculado por el backend con la hora del servidor — nunca se calcula en el cliente. */
  horasRestantes: number;
}

/**
 * Revisión legal de la UAJ y su subsanación (ADR 0013 Fase 4). Espejo de
 * `SIGEC_CIERRE.Entidad/Cierre/RevisionLegalDtos.cs`.
 */

/** Observación de la UAJ con la respuesta de la UN, si la hay. */
export interface ObservacionUajDto {
  ideObservacion: number;
  ideCierreConvenio: number;
  /** Ingreso a la UAJ en que se formuló (1 el primero, 2 tras la primera subsanación…). */
  numRonda: number;
  numOrden: number;
  txtObservacion: string;
  ideUsuario: number;
  fecRegistro: string;
  txtRespuesta: string | null;
  ideUsuarioRespuesta: number | null;
  fecRespuesta: string | null;
}

export interface RondaObservaciones {
  numRonda: number;
  observaciones: ObservacionUajDto[];
}

/** Agrupa las observaciones por ronda, de la más reciente a la primera, cada una en su orden. */
export function agruparPorRonda(observaciones: readonly ObservacionUajDto[]): RondaObservaciones[] {
  const rondas = new Map<number, ObservacionUajDto[]>();
  for (const o of observaciones) rondas.set(o.numRonda, [...(rondas.get(o.numRonda) ?? []), o]);
  return [...rondas.entries()]
    .sort(([a], [b]) => b - a)
    .map(([numRonda, lista]) => ({ numRonda, observaciones: [...lista].sort((a, b) => a.numOrden - b.numOrden) }));
}

/** Última ronda (0 si no hay observaciones). */
export function ultimaRonda(observaciones: readonly ObservacionUajDto[]): number {
  return observaciones.reduce((max, o) => Math.max(max, o.numRonda), 0);
}

/** Observaciones de la última ronda sin responder: las que la UN debe subsanar (como `RevisionLegalServicio`). */
export function pendientesDeSubsanar(observaciones: readonly ObservacionUajDto[]): ObservacionUajDto[] {
  const ronda = ultimaRonda(observaciones);
  return observaciones.filter(o => o.numRonda === ronda && o.txtRespuesta === null).sort((a, b) => a.numOrden - b.numOrden);
}

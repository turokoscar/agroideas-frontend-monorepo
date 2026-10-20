/** Espejo de `SIGEC_CIERRE.Entidad/Plazos/PlazoDtos.cs`. */

export type TipoPlazo = 'ANEXO20' | 'EVALUACION_UN' | 'REVISION_UAJ';

export type EstadoPlazo = 'VIGENTE' | 'CUMPLIDO' | 'VENCIDO' | 'CANCELADO';

export const ETIQUETA_TIPO_PLAZO: Readonly<Record<TipoPlazo, string>> = {
  ANEXO20: 'Presentación del Anexo 20 (OA)',
  EVALUACION_UN: 'Evaluación de la UN',
  REVISION_UAJ: 'Revisión legal (UAJ)'
};

export const ETIQUETA_ESTADO_PLAZO: Readonly<Record<EstadoPlazo, string>> = {
  VIGENTE: 'Vigente',
  CUMPLIDO: 'Cumplido',
  VENCIDO: 'Vencido',
  CANCELADO: 'Cancelado'
};

export function etiquetaTipoPlazo(tipo: string | null | undefined): string {
  return tipo ? ETIQUETA_TIPO_PLAZO[tipo as TipoPlazo] ?? tipo : '';
}

export interface PlazoDto {
  idePlazo: number;
  ideCierreConvenio: number;
  tipPlazo: TipoPlazo;
  fecInicio: string;
  canDias: number;
  fecLimite: string;
  codDepartamento: string | null;
  codProvincia: string | null;
  estPlazo: EstadoPlazo;
  fecCierre: string | null;
  txtContingencia: string | null;
  fecRegistro: string;
}

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * Días calendario que faltan hasta `fecLimite` (negativo si ya venció), con el mismo criterio que
 * `BandejaCierreServicio`: se cuentan fechas, no horas, porque el límite es a las 23:59:59.
 */
export function diasRestantes(fecLimite: string, ahora: Date = new Date()): number {
  const limite = new Date(fecLimite);
  const inicioLimite = Date.UTC(limite.getFullYear(), limite.getMonth(), limite.getDate());
  const inicioHoy = Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  return Math.round((inicioLimite - inicioHoy) / MS_POR_DIA);
}

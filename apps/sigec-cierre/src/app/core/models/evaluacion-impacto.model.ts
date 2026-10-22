/** Evaluaciones de impacto para la USE (ADR 0013 Fase 5). Espejo de `SIGEC_CIERRE.Entidad/Anexo22/EvaluacionImpactoDtos.cs`. */

export interface IndicadorImpactoDto {
  /** PRODUCCION | PRECIO | COMERCIALIZACION | INGRESO | OBJETIVO | AMBIENTAL. */
  tipSeccion: string;
  txtConcepto: string;
  txtUnidadMedida: string | null;
  ideIndicadorSel: number | null;
  numLineaBase: number | null;
  /** Años 1 a 3. */
  programado: (number | null)[];
  ejecutado: (number | null)[];
  variacionAnual: (number | null)[];
  numEjecutadoCierre: number | null;
  pctVariacionLineaBase: number | null;
  flgDesviacionCritica: boolean;
}

export interface EvaluacionImpactoDto {
  ideCierreConvenio: number;
  ideConvenio: number;
  txtNumeroConvenio: string | null;
  /** Fecha de firma del convenio (no confundir con `fecFirma`, la del Anexo 22). */
  fecFirmaConvenio: string | null;
  txtOrganizacion: string | null;
  txtCadenaProductiva: string | null;
  txtRegion: string | null;
  txtProvincia: string | null;
  txtDistrito: string | null;
  canSociasMujeres: number | null;
  canSociosHombres: number | null;
  numSocios: number | null;
  numHectareas: number | null;
  tipResultado: string | null;
  /** Momento en que se presentó firmado el Anexo 22. */
  fecFirma: string;
  indicadores: IndicadorImpactoDto[];
}

export interface FiltroEvaluaciones {
  cadena?: string | null;
  region?: string | null;
  pagina?: number;
  cantidad?: number;
}

export const ETIQUETA_SECCION: Readonly<Record<string, string>> = {
  PRODUCCION: 'Producción',
  PRECIO: 'Precios',
  COMERCIALIZACION: 'Comercialización',
  INGRESO: 'Ingresos',
  OBJETIVO: 'Objetivos específicos',
  AMBIENTAL: 'Práctica ambiental'
};

/** Indicadores con desviación crítica de una evaluación (semáforo de la lista). */
export function criticos(e: EvaluacionImpactoDto): number {
  return e.indicadores.filter(i => i.flgDesviacionCritica).length;
}

/** Anexo 18 - Informe de Comprobación, registrado por la UN (CLAUDE.md, ADR-010). */
export interface InformeComprobacionDto {
  ideInforme?: number;
  ideRtf: number;
  txtNumeroInforme: string;
  txtInformeUn?: string;
  txtInformeVisita?: string;
  txtInformeAmbiental?: string;
  txtInformeFinanciero?: string;
  txtDificultades?: string;
  txtRecomendaciones?: string;
  txtConclusiones?: string;
  txtRepresentanteUn: string;
  fecInforme?: string;
  estCalificacion?: 'APROBADO_CONFORME' | 'RECHAZADO_OBSERVACIONES' | string;
}

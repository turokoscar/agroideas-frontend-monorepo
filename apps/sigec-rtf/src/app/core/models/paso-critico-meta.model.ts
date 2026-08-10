// ADR-002 — Metas físicas/financieras desde BD_SEL vía sel-api-general
export interface PasoCriticoMeta {
  id: number;
  marcoLogicoID: number;
  pasoCriticoID: number;
  metaFisicaProgramada: number;
  metaFisicaEjecutada: number;
  metaFinancieraProgramada: number;
  metaFinancieraEjecutada: number;
  comentarios?: string;
  evidencia?: string;
  descripcion?: string;
  tipo?: string;
  unidadMedida?: string;
  orden?: number;
}

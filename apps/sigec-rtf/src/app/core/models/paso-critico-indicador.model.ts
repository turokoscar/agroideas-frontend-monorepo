// ADR-003 — Indicadores desde BD_SEL vía sel-api-general
export interface PasoCriticoIndicador {
  id: number;
  pasoCriticoID: number;
  postulanteIndicadorCadenaID: number;
  cadenaProductiva?: string;
  indicador?: string;
  unidadMedida?: string;
  lineaBase?: number;
  meta?: number;
  lineaCierre?: number;
  metaProgramada: number;
  metaEjecutada: number;
  evidencia?: string;
  comentarios?: string;
}

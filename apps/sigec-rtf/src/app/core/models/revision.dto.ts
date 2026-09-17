/** Espeja RevisionDto (sigec-api-rtf, SRT_TMD_REVISION). Una fila de evaluación ya guardada. */
export interface RevisionDto {
  ideRevision: number;
  ideRtf: number;
  txtSeccion: string;
  estConformidad: 'CONFORME' | 'OBSERVADO';
  txtObservacion?: string;
  /** ADR-014 Parte 4. */
  txtCategoria?: string;
  /** ADR-014 Parte 4. */
  estSubsanable?: boolean;
  fecRegistro: string;
  /** ADR-016 Fase 1 (sigec-api-rtf): solo significativo cuando estConformidad = OBSERVADO. */
  estAtencion?: 'PENDIENTE' | 'ATENDIDA';
  /** ADR-016 Fase 1: respuesta de la OA al atender la observación. */
  txtRespuestaOa?: string;
  /** ADR-016 Fase 1. */
  fecAtencion?: string;
}

/** ADR-016 Fase 3 (sigec-api-rtf): body de POST rtfs/{id}/evaluaciones/atencion. */
export interface RevisionAtencionItem {
  ideRevision: number;
  txtRespuesta: string;
}

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
}

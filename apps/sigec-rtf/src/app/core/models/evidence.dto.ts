export interface EvidenceDto {
  ideEvidencia: number;
  ideRtf: number;
  ideConcepto: number;
  // Free-text en el backend (RtfCabeceraServicio.RegistrarEvidenciaAsync) -- también existen
  // 'ACTA_CAMPO' (subida por la UN) y 'ANEXO17_FIRMADO' (copia firmada del Anexo 17 subida por la OA).
  tipConcepto: string;
  ideArchivo: string;
  txtNombreArchivo?: string;
  /** ADR-014 Parte 6 (Fase 1): nombre libre dado por la OA, usado en "Informes remitidos" cuando existe. */
  txtEtiqueta?: string;
  fecRegistro?: string;
}

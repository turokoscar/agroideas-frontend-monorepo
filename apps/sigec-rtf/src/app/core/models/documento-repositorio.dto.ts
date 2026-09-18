/**
 * Fila del repositorio consolidado de documentos de un RTF (Anexo 17, evidencias, informes,
 * Anexo 18 y su copia firmada) -- espejo de `DocumentoRepositorioDto` (SIGEC_RTF.Entidad/Rtf).
 * `ANEXO_17`/`ANEXO_18` son categorías sintéticas (el documento oficial, congelado o regenerado
 * al vuelo, sin fila propia en evidencias); `EVIDENCIA` corresponde 1:1 a una fila de
 * `SRT_TMD_EVIDENCIA`, incluida la copia firmada si se adjuntó.
 */
export interface DocumentoRepositorioDto {
  categoria: 'ANEXO_17' | 'ANEXO_18' | 'EVIDENCIA';
  tipConcepto: string;
  txtNombreArchivo: string;
  fecRegistro: string;
  ideEvidencia?: number;
}

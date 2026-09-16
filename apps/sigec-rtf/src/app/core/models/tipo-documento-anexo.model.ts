/**
 * ADR-014 Parte 6 (Fase 3): espejo en TypeScript de `TipoDocumentoAnexo`
 * (SIGEC_RTF.Entidad/Rtf/EstadoRtf.cs). El backend nunca valida `tipConcepto` contra un enum
 * cerrado (sigue siendo texto libre en `RegistrarEvidenciaAsync`) — este catálogo solo ordena
 * las opciones del selector del tab "Anexos" según las dos familias que exige el Instructivo
 * AGROIDEAS: los "Informes" son los únicos que `PdfService` lista en "Informes remitidos"
 * (Fase 2); los "Documentos sustentatorios" quedan adjuntos al expediente sin aparecer ahí.
 */
export interface TipoDocumentoAnexoOption {
  value: string;
  label: string;
}

export const TIPOS_INFORME: TipoDocumentoAnexoOption[] = [
  { value: 'INFORME_MENSUAL_ASISTENTE', label: 'Informe mensual del Asistente Técnico/Coordinador PNT' },
  { value: 'INFORME_VALORIZACION_PROVEEDOR', label: 'Informe de valorización del proveedor' },
  { value: 'INFORME_CAPACITACION', label: 'Informe de capacitación/asistencia técnica' },
  { value: 'INFORME_CIERRE_PNT', label: 'Informe de cierre del PNT' }
];

export const TIPOS_SUSTENTO: TipoDocumentoAnexoOption[] = [
  { value: 'ACTA_ENTREGA_BIENES_OBRA', label: 'Acta de entrega de bienes / recepción de obra' },
  { value: 'CONTRATO', label: 'Contrato con proveedor o asistente técnico' },
  { value: 'FACTURA_RHE', label: 'Factura o Recibo por Honorarios' },
  { value: 'VOUCHER_CONTRAPARTIDA', label: 'Voucher de transferencia (contrapartida OA)' },
  { value: 'GUIA_REMISION', label: 'Guía de remisión' },
  { value: 'ACTA_CONFORMIDAD', label: 'Acta de conformidad de recepción' },
  { value: 'ACTA_ENTREGA_RECEPCION', label: 'Acta de entrega y recepción (proveedor / OA / socio)' },
  { value: 'FOTOGRAFIA_GEORREFERENCIADA', label: 'Fotografía georreferenciada' },
  { value: 'PLANILLA_PRODUCCION', label: 'Planilla de producción / comercialización' }
];

export const TIPO_OTROS: TipoDocumentoAnexoOption = { value: 'OTROS', label: 'Otros' };

/** Único valor que además de PDF admite JPG/PNG (ver RtfCabeceraServicio.RegistrarEvidenciaAsync). */
export const TIPO_FOTOGRAFIA_GEORREFERENCIADA = 'FOTOGRAFIA_GEORREFERENCIADA';

const TODOS_LOS_LABELS = new Map(
  [...TIPOS_INFORME, ...TIPOS_SUSTENTO, TIPO_OTROS].map(o => [o.value, o.label])
);

/** true si `tipConcepto` es uno de los documentos del tab "Anexos" (informe, sustento u otros) — excluye METAFISICA/INDICADOR/ACTA_CAMPO/ANEXO17_FIRMADO. */
export function esDocumentoAnexo(tipConcepto: string): boolean {
  return TODOS_LOS_LABELS.has(tipConcepto);
}

export function etiquetaTipoDocumento(tipConcepto: string): string {
  return TODOS_LOS_LABELS.get(tipConcepto) ?? tipConcepto;
}

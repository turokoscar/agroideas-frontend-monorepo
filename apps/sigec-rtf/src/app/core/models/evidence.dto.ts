export interface EvidenceDto {
  ideEvidencia: number;
  ideRtf: number;
  ideConcepto: number;
  tipConcepto: 'METAFISICA' | 'INDICADOR';
  ideArchivo: string;
  txtNombreArchivo?: string;
  fecRegistro?: string;
}

export interface UrEvaluacionItemDto {
  id: number;
  kind: 'META' | 'INDICADOR';
  estConformidad: 'CONFORME' | 'OBSERVADO';
  txtObservacion?: string;
}

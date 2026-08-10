export interface IndicadorDto {
  ideIndicadorAvance?: number;
  ideRtf?: number;
  ideIndicador: number;
  nombre?: string;
  unidad?: string;
  lineaBase?: number;
  canProgramado: number;
  canEjecutado: number | null;
  txtComentario?: string;
}

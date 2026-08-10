export interface MetaFisicaDto {
  ideMetaFisica?: number;
  ideRtf?: number;
  ideActividad: number;
  actividad?: string;
  unidad?: string;
  lineaBase?: number;
  canProgramada: number;
  canEjecutada: number | null;
  txtComentario?: string;
}

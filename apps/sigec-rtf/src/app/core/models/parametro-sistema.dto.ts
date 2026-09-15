/** Maestro de parámetros del sistema (ADR-013): plazos legales y correos, editables sin redeploy. */
export interface ParametroSistemaDto {
  codParametro: string;
  valParametro: string;
  txtDescripcion: string;
  fecActualizacion?: string;
}

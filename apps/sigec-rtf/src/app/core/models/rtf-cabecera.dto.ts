export interface RtfCabeceraDto {
  ideRtf?: number;
  ideConvenio: number;
  numPasoCritico: number; // ADR-012: columna puente, no usar para lógica de negocio — usar idePasoCritico
  idePasoCritico?: number; // ADR-012: id real de paso crítico en BD_SEL, fuente de verdad
  fecInicioPeriodo: string;
  fecFinPeriodo: string;
  estRtf?: string;
  fecHabilitacion: string;
  fecLimite: string;
  fecRegistro?: string;
  fecEnvio?: string;
  txtActividadesRealizadas?: string;
  txtActividadesNoRealizadas?: string;
  txtLogros?: string;
  txtDificultades?: string;
  txtCambiosPaso?: string;
}

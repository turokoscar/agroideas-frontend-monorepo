export interface GastoF1Dto {
  ideGastoF1: number;
  ideRtf: number;
  txtItemNombre?: string;
  txtUnidadMedida?: string;
  canCantidad: number;
  numPrecioAdjudicado: number;
  numMontoRendido: number;
  fecEmision?: string;
  txtSerieNumero?: string;
  txtTipoCpe?: string;
  txtProveedorNombre?: string;
  txtProveedorRuc?: string;
  fecRegistro?: string; // ADR-012: fecha de la última sincronización del snapshot con KOFIX
  /** Guid (como string) del documento de sustento que KOFIX adjuntó al sincronizar, si lo trajo. */
  ideArchivo?: string;
}

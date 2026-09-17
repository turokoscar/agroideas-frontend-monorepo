export interface GastoF1Dto {
  ideGastoF1: number;
  ideRtf: number;
  /** Id del ítem de marco lógico en BD_SEL (ADR-017). Llave de unión para agrupar este gasto
   * bajo su línea presupuestal — ver RelacionGastosF1Dto. */
  ideItemMl?: number;
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

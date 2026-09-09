/** Carta de Notificación / Notarial (control de plazos, Fase 4 — ver ADR sobre flujo de cartas). */
export interface CartaDto {
  ideCarta?: number;
  ideRtf: number;
  tipCarta: 'PRIMERA_NOTIFICACION' | 'CARTA_NOTARIAL' | string;
  numDocumento: string;
  fecNotificacion: string;
  canDiasOtorgados: number;
  ideArchivo?: string;
  fecRegistro?: string;
}

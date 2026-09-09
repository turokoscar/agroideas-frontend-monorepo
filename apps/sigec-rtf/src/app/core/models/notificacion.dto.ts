/** Notificación in-app (Fase 6): dirigida a la OA (por convenio) o a la UN (broadcast). */
export interface NotificacionDto {
  ideNotificacion: number;
  ideRtf: number;
  ideConvenio: number;
  tipDestinatario: 'OA' | 'UN' | string;
  txtTitulo: string;
  txtMensaje: string;
  estLeida: boolean;
  fecRegistro: string;
}

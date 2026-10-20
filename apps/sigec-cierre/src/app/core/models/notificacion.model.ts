/** Espejo de `SIGEC_CIERRE.Entidad/Notificaciones/NotificacionDtos.cs`. */

export interface NotificacionDto {
  ideNotificacion: number;
  ideCierreConvenio: number;
  ideConvenio: number;
  tipDestinatario: string;
  txtEvento: string;
  txtTitulo: string;
  txtMensaje: string;
  codArchivo: string | null;
  fecRegistro: string;
  fecEfecto: string;
  flgLeida: boolean;
  fecLectura: string | null;
}

/** Constancia de cada correo (`GET /cierres/{id}/envios`, solo personal). */
export interface EnvioNotificacionDto {
  ideEnvio: number;
  ideNotificacion: number;
  tipDestinatario: string;
  txtEvento: string;
  tipCanal: string;
  txtDestinatario: string | null;
  txtAsunto: string;
  /** PENDIENTE | ENVIADO | FALLIDO. */
  estEnvio: string;
  canIntentos: number;
  txtError: string | null;
  fecRegistro: string;
  fecEnvio: string | null;
}

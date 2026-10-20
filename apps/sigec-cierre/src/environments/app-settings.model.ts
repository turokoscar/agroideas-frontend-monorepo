/**
 * Forma común de los `environment*.ts` de sigec-cierre. Todo valor ajustable de la app vive aquí,
 * no fijo en el código, para poder cambiarlo por ambiente sin tocar componentes ni servicios.
 */
export interface AppSettings {
  production: boolean;
  /** Base de sel-api-seguridad (`POST {apiAuth}/login`). */
  apiAuth: string;
  /** Base de sigec-api-cierre, con su prefijo `api/v1`. */
  apiUrl: string;
  /** `deviceId` que se envía al iniciar sesión en sel-api-seguridad. */
  deviceId: string;
  paginacion: {
    /** Tamaño de página de los listados ("Todos"). */
    cantidadPorPagina: number;
    /**
     * Máximo de `cantidad` que acepta la API (`ValidadoresCierre.CantidadMaxima`). La bandeja se
     * pide en páginas de este tamaño; debe coincidir con la API o responderá 400.
     */
    cantidadMaxima: number;
  };
  archivos: {
    /** Tamaño máximo de un PDF que se sube (el mismo límite que valida sel-api-archivos: 10 MB). */
    tamanoMaximoPdfMb: number;
  };
  notificaciones: {
    /** Cada cuánto se refresca el contador de no leídas de la campana. */
    intervaloRefrescoMs: number;
    /** Cuántas notificaciones muestra la campana al abrirse. */
    cantidadEnCampana: number;
  };
}

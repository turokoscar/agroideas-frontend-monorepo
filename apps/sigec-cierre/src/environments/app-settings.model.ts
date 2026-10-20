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
  evaluacion: {
    /**
     * Umbral de desviación crítica del Anexo 22, en %: una variación por debajo se resalta. Debe coincidir con
     * `VariacionIndicador.UmbralDesviacionCritica` de sigec-api-cierre (−20).
     */
    umbralDesviacionCriticaPct: number;
  };
  revisionLegal: {
    /** Límites de `ObservarUajRequestValidator` y `SubsanacionRequestValidator` de sigec-api-cierre (deben coincidir). */
    maximoObservaciones: number;
    longitudObservacion: number;
    longitudRespuesta: number;
    /** Longitud máxima del número de la RDE (`SuscripcionRdeRequestValidator`). */
    longitudNumeroRde: number;
  };
  administracion: {
    /** Rango de los parámetros de plazo en días (`ParametroServicio.ValidarValor`). */
    diasPlazoMinimo: number;
    diasPlazoMaximo: number;
    /** Longitudes de `FeriadoServicio` y `ActualizarParametroRequestValidator`. */
    longitudDescripcionFeriado: number;
    longitudSustentoFeriado: number;
    longitudValorParametro: number;
    /** Primer año que publica gob.pe (`ImportarFeriadosRequestValidator`). */
    primerAnioGobPe: number;
    /**
     * Días hacia adelante que debe cubrir el calendario: se avisa si algún año entre hoy y hoy + este número no
     * tiene días inhábiles registrados (cubre el plazo de 90 días de la UN con margen).
     */
    diasAnticipacionCalendario: number;
  };
  notificaciones: {
    /** Cada cuánto se refresca el contador de no leídas de la campana. */
    intervaloRefrescoMs: number;
    /** Cuántas notificaciones muestra la campana al abrirse. */
    cantidadEnCampana: number;
  };
}

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
  /** Base de sel-api-general (`api/v2`): búsqueda de convenios para iniciar un expediente. */
  apiGeneral: string;
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
  plazos: {
    /**
     * Días antes del vencimiento en que un plazo se muestra "por vencer" (ámbar). Mismo valor por defecto que el
     * parámetro `ALERTA_DIAS_PREVIOS` de sigec-api-cierre, que decide el semáforo de la bandeja.
     */
    diasAvisoPrevio: number;
  };
  busquedaConvenios: {
    /** Sugerencias que se piden a sel-api-general por búsqueda. */
    cantidadSugerencias: number;
    /** Caracteres mínimos antes de buscar. */
    longitudMinima: number;
    /** Espera desde la última tecla hasta consultar, en ms. */
    esperaMs: number;
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
    /**
     * Espera desde la última edición del borrador del Anexo 22 hasta guardarlo solo, en ms (ADR 0015, D2). El borrador
     * se guarda con el mismo `PUT` que el botón Guardar.
     */
    esperaAutoguardadoMs: number;
    /** Caracteres máximos de cada texto del Anexo 22: `ValidadoresAnexo22.MaximoTexto` de sigec-api-cierre (deben coincidir). */
    longitudTexto: number;
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

export const environment = {
  production: false,
  apiAuth: 'https://localhost:7101/api/Auth',
  apiUrl: 'https://localhost:7300/api/v1',
  apiGeneral: 'https://localhost:7080/api/v2',
  // Integración con Cierre de Convenio (ADR 0013 Fase A): el Anexo 20 se llena aquí, con el último RTF.
  cierre: {
    /** Base de sigec-api-cierre, con su prefijo api/v1. */
    apiUrl: 'https://localhost:7400/api/v1',
    /** Dirección de la app sigec-cierre, para el enlace "Ver mi cierre". */
    urlApp: 'http://localhost:4400',
    /** Tamaño máximo del PDF firmado del Anexo 20 (el mismo límite que valida sel-api-archivos). */
    tamanoMaximoPdfMb: 10
  }
};

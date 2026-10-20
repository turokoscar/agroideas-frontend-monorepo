// Calidad (VPS): rutas relativas. El Nginx del contenedor sigec-rtf-ui las reenvía
// a la API RTF y a test.agroideas.gob.pe, así el navegador no hace llamadas cross-origin.
export const environment = {
  production: true,
  apiAuth: '/api-seguridad/api/Auth',
  apiUrl: '/api/v1',
  apiGeneral: '/api-general/api/v2',
  // Integración con Cierre de Convenio (ADR 0013 Fase A): el Anexo 20 se llena aquí, con el último RTF.
  cierre: {
    /** Base de sigec-api-cierre, con su prefijo api/v1. */
    apiUrl: '/api-cierre/api/v1',
    /** Dirección de la app sigec-cierre, para el enlace "Ver mi cierre". */
    urlApp: 'https://sigec-cierre.oscar-pazos.com',
    /** Tamaño máximo del PDF firmado del Anexo 20 (el mismo límite que valida sel-api-archivos). */
    tamanoMaximoPdfMb: 10
  }
};

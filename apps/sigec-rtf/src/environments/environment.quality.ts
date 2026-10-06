// Calidad (VPS): rutas relativas. El Nginx del contenedor sigec-rtf-ui las reenvía
// a la API RTF y a test.agroideas.gob.pe, así el navegador no hace llamadas cross-origin.
export const environment = {
  production: true,
  apiAuth: '/api-seguridad/api/Auth',
  apiUrl: '/api/v1',
  apiGeneral: '/api-general/api/v2'
};

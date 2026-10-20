// Calidad (VPS): rutas relativas. El Nginx del contenedor sigec-cierre-ui las reenvía
// a la API de Cierre y a test.agroideas.gob.pe, así el navegador no hace llamadas cross-origin.
export const environment = {
  production: true,
  apiAuth: '/api-seguridad/api/Auth',
  apiUrl: '/api/v1'
};

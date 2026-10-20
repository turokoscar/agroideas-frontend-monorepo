import { AppSettings } from './app-settings.model';

// Calidad (VPS): rutas relativas. El Nginx del contenedor sigec-cierre-ui las reenvía
// a la API de Cierre y a test.agroideas.gob.pe, así el navegador no hace llamadas cross-origin.
export const environment: AppSettings = {
  production: true,
  apiAuth: '/api-seguridad/api/Auth',
  apiUrl: '/api/v1',
  deviceId: 'web-admin',
  paginacion: {
    cantidadPorPagina: 20,
    cantidadMaxima: 100
  },
  archivos: {
    tamanoMaximoPdfMb: 10
  },
  evaluacion: {
    umbralDesviacionCriticaPct: -20
  },
  revisionLegal: {
    maximoObservaciones: 50,
    longitudObservacion: 2000,
    longitudRespuesta: 4000,
    longitudNumeroRde: 50
  },
  administracion: {
    diasPlazoMinimo: 1,
    diasPlazoMaximo: 365,
    longitudDescripcionFeriado: 300,
    longitudSustentoFeriado: 500,
    longitudValorParametro: 200,
    primerAnioGobPe: 2017,
    diasAnticipacionCalendario: 120
  },
  notificaciones: {
    intervaloRefrescoMs: 60_000,
    cantidadEnCampana: 20
  }
};

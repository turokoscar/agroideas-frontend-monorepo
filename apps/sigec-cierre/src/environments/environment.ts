import { AppSettings } from './app-settings.model';

export const environment: AppSettings = {
  production: false,
  apiAuth: 'https://localhost:7101/api/Auth',
  apiUrl: 'https://localhost:7400/api/v1',
  apiGeneral: 'https://localhost:7080/api/v2',
  deviceId: 'web-admin',
  paginacion: {
    cantidadPorPagina: 20,
    cantidadMaxima: 100
  },
  plazos: {
    diasAvisoPrevio: 5
  },
  busquedaConvenios: {
    cantidadSugerencias: 10,
    longitudMinima: 2,
    esperaMs: 300
  },
  archivos: {
    tamanoMaximoPdfMb: 10
  },
  evaluacion: {
    umbralDesviacionCriticaPct: -20,
    esperaAutoguardadoMs: 3000,
    longitudTexto: 8000
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

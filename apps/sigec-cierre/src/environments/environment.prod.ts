import { AppSettings } from './app-settings.model';

export const environment: AppSettings = {
  production: true,
  apiAuth: 'https://localhost:7101/api/Auth',
  apiUrl: 'https://localhost:7400/api/v1',
  deviceId: 'web-admin',
  paginacion: {
    cantidadPorPagina: 20,
    cantidadMaxima: 100
  },
  archivos: {
    tamanoMaximoPdfMb: 10
  },
  notificaciones: {
    intervaloRefrescoMs: 60_000,
    cantidadEnCampana: 20
  }
};

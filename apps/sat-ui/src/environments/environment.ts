/**
 * Configuración de desarrollo.
 *
 * En la compilación de producción este archivo se sustituye por
 * `environment.prod.ts` mediante el `fileReplacements` declarado en
 * `apps/sat-ui/project.json`. Al cambiar una clave aquí hay que reflejarla
 * también allí, o la de producción se quedará con el valor antiguo.
 */
export const environment = {
  production: false,
  apiAuth: 'https://localhost:7081/api/Auth',
  apiUrl: 'https://localhost:7081/api'
};

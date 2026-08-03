/**
 * Configuración de producción. Sustituye a `environment.ts` en la compilación
 * de producción (ver `fileReplacements` en `apps/sat-ui/project.json`).
 *
 * Hoy apunta al mismo host que desarrollo porque el sistema aún no está
 * desplegado. Al publicar hay que cambiar estas URL por las reales: son las
 * que quedan compiladas en el bundle, no se leen en tiempo de ejecución.
 */
export const environment = {
  production: true,
  apiAuth: 'https://localhost:7081/api/Auth',
  apiUrl: 'https://localhost:7081/api'
};

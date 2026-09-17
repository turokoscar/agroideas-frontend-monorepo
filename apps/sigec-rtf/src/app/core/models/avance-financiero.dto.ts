/** GET pasos-criticos/{idPc}/avance-financiero (sigec-api-rtf). Programado/Ejecutado están
 * acotados al Paso Crítico: no confundir con RtfService.budget()/disbursed(), que son totales
 * del convenio completo (ver oa-rtf.service.ts loadDashboard). */
export interface AvanceFinancieroPasoCriticoDto {
  ideConvenio: number;
  pasoCriticoId: number;
  numeroPasoCritico: number;
  ejecutado: number;
  programado: number;
  porcentajeAvance: number;
}

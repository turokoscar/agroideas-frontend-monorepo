/** Reporte de cumplimiento de plazos legales (ADR-013), agregado por rango de fechas. */
export interface ReporteCumplimientoPlazosDto {
  fechaDesde: string;
  fechaHasta: string;
  rtfsVencidos: number;
  cartasNotificacion: number;
  cartasNotariales: number;
  bloqueosDefinitivos: number;
}
